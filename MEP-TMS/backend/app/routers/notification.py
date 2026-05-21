from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import row_to_api

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

class NotificationResponse(BaseModel):
    id: str
    type: str
    message: str
    recipient_id: Optional[str] = None
    is_read: bool
    created_at: str

class NotificationCreate(BaseModel):
    type: str
    message: str
    recipient_id: Optional[str] = None

@router.get("", response_model=List[NotificationResponse])
async def list_notifications(current_user: dict = Depends(get_current_user)):
    """List all notifications for the platform/recipient"""
    db = get_db()
    try:
        # Fetch all notifications, sorted by created_at descending
        result = db.table("notifications").select("*").order("created_at", desc=True).limit(50).execute()
        
        notifications = []
        for row in result.data:
            # Handle timestamps carefully
            created_at_val = row.get("created_at", datetime.utcnow().isoformat())
            notifications.append(NotificationResponse(
                id=str(row.get("id")),
                type=str(row.get("type")),
                message=str(row.get("message")),
                recipient_id=str(row.get("recipient_id")) if row.get("recipient_id") else None,
                is_read=bool(row.get("is_read", False)),
                created_at=str(created_at_val)
            ))
        return notifications
    except Exception as e:
        # Fallback to empty if db query fails or table not populated
        print(f"[Warn] Failed to fetch notifications: {e}")
        return []

@router.post("", response_model=NotificationResponse)
async def create_notification(
    notification_data: NotificationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new notification"""
    db = get_db()
    try:
        new_notif = {
            "type": notification_data.type,
            "message": notification_data.message,
            "recipient_id": notification_data.recipient_id,
            "is_read": False
        }
        result = db.table("notifications").insert(new_notif).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create notification")
        
        row = result.data[0]
        return NotificationResponse(
            id=str(row.get("id")),
            type=str(row.get("type")),
            message=str(row.get("message")),
            recipient_id=str(row.get("recipient_id")) if row.get("recipient_id") else None,
            is_read=bool(row.get("is_read", False)),
            created_at=str(row.get("created_at"))
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/read/{id}")
async def mark_as_read(id: str, current_user: dict = Depends(get_current_user)):
    """Mark a notification as read"""
    db = get_db()
    try:
        db.table("notifications").update({"is_read": True}).eq("id", id).execute()
        return {"status": "success", "message": "Notification marked as read"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/read-all")
async def mark_all_as_read(current_user: dict = Depends(get_current_user)):
    """Mark all notifications as read"""
    db = get_db()
    try:
        # Simply mark all as read for this user / all
        db.table("notifications").update({"is_read": True}).eq("is_read", False).execute()
        return {"status": "success", "message": "All notifications marked as read"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
