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

        # Get allowed batch names and user IDs if user is coordinator or trainer
        role = current_user.get("role")
        user_id = current_user.get("sub") or current_user.get("email") or ""
        
        my_batch_names = None
        my_user_ids = None
        import json
        
        if role == "COORDINATOR":
            my_batch_names = []
            my_user_ids = {user_id}
            
            # Fetch batches created by this coordinator
            batches_res = db.table("batches").select("id, batch_name, trainers, description").execute()
            my_batch_ids = []
            my_trainers = set()
            if batches_res.data:
                for b in batches_res.data:
                    desc_str = b.get("description")
                    creator = ""
                    if desc_str and desc_str.startswith("{"):
                        try:
                            creator = json.loads(desc_str).get("created_by", "")
                        except:
                            pass
                    is_original = not creator and user_id in ["df772f20-b396-4a3b-8ddc-68fcd54b6060", "728f45b3-f6bd-4cfa-860f-a42c89682b33"]
                    if creator == user_id or is_original:
                        my_batch_ids.append(b.get("id"))
                        my_batch_names.append(b.get("batch_name"))
                        trainers = b.get("trainers", []) or []
                        for t in trainers:
                            my_trainers.add(t)
            
            # Fetch trainer user IDs
            if my_trainers:
                trainers_res = db.table("users").select("id").in_("full_name", list(my_trainers)).execute()
                if trainers_res.data:
                    for u in trainers_res.data:
                        my_user_ids.add(u.get("id"))
                trainers_res_email = db.table("users").select("id").in_("email", list(my_trainers)).execute()
                if trainers_res_email.data:
                    for u in trainers_res_email.data:
                        my_user_ids.add(u.get("id"))
            
            # Fetch candidate user IDs
            if my_batch_ids:
                users_res = db.table("users").select("email").eq("role", "TRAINEE").ov("assigned_batches", my_batch_ids).execute()
                emails = {u["email"].strip().lower() for u in users_res.data} if users_res.data else set()
                
                candidates_res = db.table("candidates").select("email").in_("batch_id", my_batch_ids).execute()
                if candidates_res.data:
                    for c in candidates_res.data:
                        emails.add(c.get("email").strip().lower())
                        
                if emails:
                    users_res2 = db.table("users").select("id").in_("email", list(emails)).execute()
                    if users_res2.data:
                        for u in users_res2.data:
                            my_user_ids.add(u.get("id"))
        elif role == "TRAINER":
            my_batch_names = []
            my_user_ids = {user_id}
            
            # Fetch batches where this trainer is assigned
            trainer_name = current_user.get("fullName", "")
            user_email = current_user.get("email", "")
            
            batches_res = db.table("batches").select("id, batch_name, trainers").execute()
            my_batch_ids = []
            if batches_res.data:
                for b in batches_res.data:
                    trainers = b.get("trainers", []) or []
                    trainers_clean = [t.strip().lower() for t in trainers]
                    if (trainer_name and trainer_name.strip().lower() in trainers_clean) or (user_email and user_email.strip().lower() in trainers_clean):
                        my_batch_ids.append(b.get("id"))
                        my_batch_names.append(b.get("batch_name"))
            
            # Fetch candidate user IDs
            if my_batch_ids:
                users_res = db.table("users").select("email").eq("role", "TRAINEE").ov("assigned_batches", my_batch_ids).execute()
                emails = {u["email"].strip().lower() for u in users_res.data} if users_res.data else set()
                
                candidates_res = db.table("candidates").select("email").in_("batch_id", my_batch_ids).execute()
                if candidates_res.data:
                    for c in candidates_res.data:
                        emails.add(c.get("email").strip().lower())
                        
                if emails:
                    users_res2 = db.table("users").select("id").in_("email", list(emails)).execute()
                    if users_res2.data:
                        for u in users_res2.data:
                            my_user_ids.add(u.get("id"))
        elif role == "TRAINEE":
            my_batch_names = []
            my_user_ids = {user_id}
            
            # Fetch candidates associated with this trainee's email
            user_email = current_user.get("email", "").strip().lower()
            candidates_res = db.table("candidates").select("batch_id").eq("email", user_email).execute()
            my_batch_ids = []
            if candidates_res.data:
                my_batch_ids = [c.get("batch_id") for c in candidates_res.data if c.get("batch_id")]
                
            # Fetch user assigned_batches from users table
            user_res = db.table("users").select("assigned_batches").eq("id", user_id).execute()
            if user_res.data and user_res.data[0].get("assigned_batches"):
                my_batch_ids.extend(user_res.data[0].get("assigned_batches"))
                
            my_batch_ids = list(set(my_batch_ids))
            
            # Fetch batch names for these batch IDs
            if my_batch_ids:
                batches_res = db.table("batches").select("batch_name").in_("id", my_batch_ids).execute()
                if batches_res.data:
                    my_batch_names = [b.get("batch_name") for b in batches_res.data if b.get("batch_name")]

        # 3. Fetch notifications that are within the 24h window and match ALLOWED_TYPES
        allowed_types = ["SETTING_CHANGE", "BATCH_CREATED", "BATCH_CREATION", "MESSAGE_LOG", "BATCH_ENDING", "BATCH_STATUS_CHANGED", "ATTENDANCE_UPLOAD", "ASSESSMENT_UPLOAD", "FILE_UPLOAD"]
        result = db.table("notifications")\
            .select("*")\
            .in_("type", allowed_types)\
            .gte("created_at", twenty_four_hours_ago)\
            .order("created_at", desc=True)\
            .execute()
        
        notifications = []
        for row in result.data:
            # If coordinator, trainer, or trainee, check if notification belongs to their batches/users
            if role in ["COORDINATOR", "TRAINER", "TRAINEE"]:
                recipient_id = row.get("recipient_id")
                # If it's user log (recipient_id is set), check if user is in my_user_ids
                if recipient_id and recipient_id not in my_user_ids:
                    continue
                # If it's batch-related, check if message refers to any of my batches
                msg = row.get("message", "")
                is_batch_related = any(k in row.get("type", "") for k in ["BATCH", "CURRICULUM", "ATTENDANCE", "ASSESSMENT"]) or "batch" in msg.lower()
                if is_batch_related and my_batch_names is not None:
                    # Check if any of my batch names is in the message
                    if not any(bn in msg for bn in my_batch_names):
                        continue
                        
                # Trainee specific filters to hide admin, trainer, and other trainees' activity notifications
                if role == "TRAINEE":
                    if row.get("type") == "FILE_UPLOAD":
                        continue
                    
                    msg_lower = msg.lower()
                    if "trainee" in msg_lower:
                        my_name = current_user.get("fullName", "").strip().lower()
                        # If a trainee is mentioned, it must be the current trainee
                        if my_name and my_name not in msg_lower:
                            continue
                            
                    if "marked/updated attendance" in msg_lower or "graded/updated assessment" in msg_lower:
                        continue
                        
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
