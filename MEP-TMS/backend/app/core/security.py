from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings

import bcrypt
security = HTTPBearer()

def hash_password(password: str) -> str:
    """Hash password using pure bcrypt"""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password using pure bcrypt"""
    try:
        plain_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(plain_bytes, hashed_bytes)
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt

def decode_token(token: str) -> dict:
    """Decode JWT token"""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        return None

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user"""
    token = credentials.credentials
    payload = decode_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    
    return payload

def has_role(*allowed_roles):
    """Role-based access control"""
    async def check_role(current_user: dict = Depends(get_current_user)):
        if current_user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return check_role

def check_batch_access(db, user: dict, batch_id: str):
    """
    Checks if a user is authorized to access/modify a batch.
    - ADMIN: has full, transparent access to view all batches.
    - COORDINATOR: can access if created by them, or if legacy batch owned by them, or if they are in the trainers list.
    - TRAINER: can access only if assigned (i.e. trainer's full name or email is in the batch's trainers list).
    - TRAINEE: can access only if trainee is assigned to the batch (i.e. batch_id is in their assigned_batches).
    """
    role = user.get("role")
    user_id = user.get("sub") or user.get("email") or ""
    
    batch_res = db.table("batches").select("*").eq("id", batch_id).execute()
    if not batch_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")
        
    if role == "ADMIN":
        return

    from app.models.models import row_to_api
    batch_row = batch_res.data[0]
    batch_data = row_to_api(batch_row)
    
    if role == "COORDINATOR":
        creator = batch_data.get("createdBy") or ""
        legacy_admins = {"df772f20-b396-4a3b-8ddc-68fcd54b6060", "728f45b3-f6bd-4cfa-860f-a42c89682b33"}
        
        is_owner = creator == user_id or (not creator and user_id in legacy_admins)
        
        # Also check if they are in trainers list
        trainers = batch_data.get("trainers", []) or []
        trainer_name = ""
        try:
            user_res = db.table("users").select("full_name").eq("id", user.get("sub")).execute()
            if user_res.data:
                trainer_name = user_res.data[0]["full_name"]
        except Exception:
            pass
            
        trainer_clean = trainer_name.strip().lower() if trainer_name else ""
        user_email_clean = user.get("email", "").strip().lower()
        
        is_trainer = False
        for t in trainers:
            t_clean = t.strip().lower()
            if (trainer_clean and t_clean == trainer_clean) or t_clean == user_email_clean:
                is_trainer = True
                break
                
        if not is_owner and not is_trainer:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied to this batch for {role}"
            )
            
    elif role == "TRAINER":
        trainers = batch_data.get("trainers", []) or []
        
        # Get trainer's full name
        trainer_name = ""
        try:
            user_res = db.table("users").select("full_name").eq("id", user.get("sub")).execute()
            if user_res.data:
                trainer_name = user_res.data[0]["full_name"]
        except Exception:
            pass
            
        trainer_clean = trainer_name.strip().lower() if trainer_name else ""
        user_email_clean = user.get("email", "").strip().lower()
        
        assigned = False
        for t in trainers:
            t_clean = t.strip().lower()
            if (trainer_clean and t_clean == trainer_clean) or t_clean == user_email_clean:
                assigned = True
                break
                
        if not assigned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Trainer is not assigned to this batch."
            )
            
    elif role == "TRAINEE":
        user_res = db.table("users").select("assigned_batches").eq("id", user.get("sub")).execute()
        if not user_res.data:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Trainee has no assigned batches.")
        assigned_batches = user_res.data[0].get("assigned_batches", []) or []
        if batch_id not in assigned_batches:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Trainee is not assigned to this batch."
            )

def check_candidate_access(db, user: dict, candidate_id: str):
    """
    Checks if a user is authorized to access/modify a candidate.
    """
    role = user.get("role")
    if role == "TRAINEE":
        cand_res = db.table("candidates").select("email").eq("id", candidate_id).execute()
        if not cand_res.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
        cand_email = cand_res.data[0].get("email", "").strip().lower()
        user_email = user.get("email", "").strip().lower()
        if cand_email != user_email:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Trainees can only access their own records.")
        return
        
    cand_res = db.table("candidates").select("batch_id").eq("id", candidate_id).execute()
    if not cand_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
    batch_id = cand_res.data[0].get("batch_id")
    if not batch_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Candidate is not assigned to any batch")
    check_batch_access(db, user, batch_id)

def check_attendance_access(db, user: dict, attendance_id: str):
    """
    Checks if a user is authorized to access/modify an attendance record.
    """
    att_res = db.table("attendances").select("batch_id", "candidate_id").eq("id", attendance_id).execute()
    if not att_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")
    batch_id = att_res.data[0].get("batch_id")
    candidate_id = att_res.data[0].get("candidate_id")
    
    role = user.get("role")
    if role == "TRAINEE":
        check_candidate_access(db, user, candidate_id)
    else:
        check_batch_access(db, user, batch_id)

def check_assessment_access(db, user: dict, assessment_id: str):
    """
    Checks if a user is authorized to access/modify an assessment record.
    """
    asm_res = db.table("assessments").select("batch_id", "candidate_id").eq("id", assessment_id).execute()
    if not asm_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")
    batch_id = asm_res.data[0].get("batch_id")
    candidate_id = asm_res.data[0].get("candidate_id")
    
    role = user.get("role")
    if role == "TRAINEE":
        check_candidate_access(db, user, candidate_id)
    else:
        check_batch_access(db, user, batch_id)

def check_report_card_access(db, user: dict, table_name: str, record_id: str):
    """
    Checks if a user is authorized to access/modify a report card record.
    """
    rc_res = db.table(table_name).select("batch_id", "email").eq("id", record_id).execute()
    if not rc_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report card record not found")
    batch_id = rc_res.data[0].get("batch_id")
    rc_email = rc_res.data[0].get("email", "").strip().lower()
    
    role = user.get("role")
    if role == "TRAINEE":
        user_email = user.get("email", "").strip().lower()
        if rc_email != user_email:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Trainees can only access their own records.")
    else:
        check_batch_access(db, user, batch_id)

