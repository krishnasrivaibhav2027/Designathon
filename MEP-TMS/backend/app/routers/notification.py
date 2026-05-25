from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from datetime import datetime, timedelta
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
        twenty_four_hours_ago = (datetime.utcnow() - timedelta(hours=24)).isoformat()
        
        # 1. Proactively delete notifications older than 24 hours
        try:
            db.table("notifications").delete().lt("created_at", twenty_four_hours_ago).execute()
        except Exception as delete_err:
            print(f"[Warn] Failed deleting old notifications: {delete_err}")

        # 2. Check for ending batches and insert a BATCH_ENDING notification
        try:
            today = datetime.utcnow().date()
            batches_res = db.table("batches").select("*").execute()
            if batches_res.data:
                for b in batches_res.data:
                    # Skip if completed or closed
                    if b.get("status") in ["COMPLETED", "CLOSED"]:
                        continue
                    end_date_str = b.get("end_date")
                    if end_date_str:
                        try:
                            clean_str = end_date_str.split("T")[0]
                            end_date = datetime.strptime(clean_str, "%Y-%m-%d").date()
                            diff_days = (end_date - today).days
                            if 0 <= diff_days <= 1:
                                notif_msg = f"Batch '{b['batch_name']}' is concluding soon ({clean_str})."
                                dup_check = db.table("notifications")\
                                    .select("*")\
                                    .eq("type", "BATCH_ENDING")\
                                    .eq("message", notif_msg)\
                                    .execute()
                                if not dup_check.data:
                                    new_notif = {
                                        "type": "BATCH_ENDING",
                                        "message": notif_msg,
                                        "is_read": False,
                                        "created_at": datetime.utcnow().isoformat()
                                    }
                                    db.table("notifications").insert(new_notif).execute()
                        except Exception as parse_err:
                            print(f"[Warn] Failed parsing end date for batch {b.get('id')}: {parse_err}")
        except Exception as ending_err:
            print(f"[Warn] Failed checking ending batches: {ending_err}")

        # 3. Fetch notifications that are within the 24h window and match ALLOWED_TYPES
        allowed_types = ["SETTING_CHANGE", "BATCH_CREATED", "BATCH_CREATION", "MESSAGE_LOG", "BATCH_ENDING", "BATCH_STATUS_CHANGED", "ATTENDANCE_UPLOAD", "ASSESSMENT_UPLOAD"]
        result = db.table("notifications")\
            .select("*")\
            .in_("type", allowed_types)\
            .gte("created_at", twenty_four_hours_ago)\
            .order("created_at", desc=True)\
            .execute()
        
        notifications = []
        for row in result.data:
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
