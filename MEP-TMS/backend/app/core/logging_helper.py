import os
from datetime import datetime
from app.core.database import get_db

def log_file_upload_and_notify(
    user: dict,
    filename: str,
    file_type: str,
    batch_id: str = None,
    batch_name: str = None,
    row_count: int = 0,
    status: str = "SUCCESS",
    error_msg: str = None
):
    """
    Logs file uploads to a local file and creates a DB notification for superiors.
    """
    db = get_db()
    email = user.get("email") or "unknown@test.com"
    role = user.get("role") or "UNKNOWN"
    user_id = user.get("sub") or ""
    
    # 1. Fetch uploader full name from users table
    full_name = "User"
    if user_id:
        try:
            res = db.table("users").select("full_name").eq("id", user_id).execute()
            if res.data:
                full_name = res.data[0].get("full_name", "User")
        except Exception as e:
            print(f"[Warn] Failed to fetch uploader name: {e}")
            
    # 2. Log to local audit file
    log_dir = "logs"
    if not os.path.exists(log_dir):
        try:
            os.makedirs(log_dir)
        except Exception:
            pass
            
    log_path = os.path.join(log_dir, "file_uploads.log")
    timestamp = datetime.utcnow().isoformat()
    log_line = f"[{timestamp}] ROLE: {role} | USER: {full_name} ({email}) | FILE: {filename} | TYPE: {file_type} | BATCH: {batch_name or 'N/A'} ({batch_id or 'N/A'}) | ROWS: {row_count} | STATUS: {status} | ERROR: {error_msg or 'None'}\n"
    
    try:
        with open(log_path, "a", encoding="utf-8") as log_file:
            log_file.write(log_line)
    except Exception as io_err:
        print(f"[Warn] Failed to write to file_uploads.log: {io_err}")
        
    # 3. Create DB notification for superiors
    if status == "SUCCESS":
        if batch_name:
            msg = f"{role.title()} {full_name} ({email}) uploaded {file_type} sheet '{filename}' for Batch '{batch_name}' ({row_count} records processed)."
        else:
            msg = f"{role.title()} {full_name} ({email}) uploaded trainees pool sheet '{filename}' ({row_count} records processed)."
            
        try:
            db.table("notifications").insert({
                "type": "FILE_UPLOAD",
                "message": msg,
                "is_read": False,
                "created_at": datetime.utcnow().isoformat()
            }).execute()
        except Exception as db_err:
            print(f"[Warn] Failed to insert FILE_UPLOAD notification: {db_err}")
