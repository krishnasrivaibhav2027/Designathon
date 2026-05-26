from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks
from typing import List
from app.schemas.schemas import (
    BatchCreate, BatchUpdate, BatchResponse, 
    CandidateCreate, CandidateResponse,
    AttendanceBatchResponse, CurriculumGenerateRequest,
    CurriculumSuggestionResponse
)
from app.core.database import get_db
from app.core.security import get_current_user, has_role, hash_password
from app.models.models import Batch, Candidate, BatchStatus, row_to_api
from app.services.email_service import EmailService
import uuid
import json
import secrets
import string
from datetime import datetime, timezone

router = APIRouter(prefix="/api/batch", tags=["batch"])

def get_next_employee_id(db) -> str:
    try:
        # Fetch existing registration numbers matching 'MAV-%'
        res = db.table("candidates").select("registration_number").like("registration_number", "MAV-%").execute()
        max_val = 0
        if res.data:
            for row in res.data:
                reg_num = row.get("registration_number", "")
                if reg_num.startswith("MAV-"):
                    try:
                        num_part = reg_num.split("-")[1]
                        num = int(num_part)
                        if num > max_val:
                            max_val = num
                    except (IndexError, ValueError):
                        continue
        next_val = max_val + 1
        return f"MAV-{next_val:03d}"
    except Exception as e:
        print(f"Error generating next employee id: {e}")
        try:
            res = db.table("candidates").select("id", count="exact").like("registration_number", "MAV-%").execute()
            count = res.count if hasattr(res, 'count') else (len(res.data) if res.data else 0)
            return f"MAV-{(count + 1):03d}"
        except Exception:
            import random
            return f"MAV-{random.randint(100, 999)}"

def generate_temp_password() -> str:
    # 2 uppercase, 4 lowercase, 2 digits
    up = "".join(secrets.choice(string.ascii_uppercase) for _ in range(2))
    low = "".join(secrets.choice(string.ascii_lowercase) for _ in range(4))
    dig = "".join(secrets.choice(string.digits) for _ in range(2))
    return up + low + dig
def to_naive_utc(dt):
    if dt is None:
        return None
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
        except ValueError:
            return None
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt

@router.post("/create", response_model=BatchResponse)
async def create_batch(batch_data: BatchCreate, background_tasks: BackgroundTasks, current_user: dict = Depends(has_role("ADMIN", "COORDINATOR"))):
    """Create a new batch"""
    db = get_db()
    
    # Check trainer overlap constraints
    if batch_data.trainers:
        new_start = to_naive_utc(batch_data.startDate)
        new_end = to_naive_utc(batch_data.endDate)
        
        if new_start and new_end:
            # Fetch all other batches
            other_batches_res = db.table("batches").select("*").execute()
            other_batches = other_batches_res.data or []
            
            for trainer in batch_data.trainers:
                trainer_clean = trainer.strip().lower()
                if not trainer_clean:
                    continue
                    
                for ob in other_batches:
                    # Skip closed batches
                    if ob.get("status") == "CLOSED":
                        continue
                        
                    ob_trainers = ob.get("trainers", []) or []
                    ob_trainers_clean = [t.strip().lower() for t in ob_trainers]
                    
                    if trainer_clean in ob_trainers_clean:
                        ob_start = to_naive_utc(ob.get("start_date"))
                        ob_end = to_naive_utc(ob.get("end_date"))
                        
                        if ob_start and ob_end:
                            # Overlap formula: S1 <= E2 and S2 <= E1
                            if ob_start <= new_end and new_start <= ob_end:
                                raise HTTPException(
                                    status_code=status.HTTP_400_BAD_REQUEST,
                                    detail=f"Trainer '{trainer}' is already assigned to batch '{ob.get('batch_name')}' from {ob_start.date()} to {ob_end.date()} which overlaps with this duration."
                                )
    
    creator_id = current_user.get("sub") or current_user.get("email") or ""
    
    batch = Batch(
        batchId=f"BATCH-{uuid.uuid4().hex[:8].upper()}",
        batchName=batch_data.batchName,
        startDate=batch_data.startDate,
        endDate=batch_data.endDate,
        trainers=batch_data.trainers,
        description=batch_data.description,
        topics=batch_data.topics,
        sizeLimit=batch_data.sizeLimit,
        questions=batch_data.questions,
        createdBy=creator_id
    )
    
    result = db.table("batches").insert(batch.to_dict()).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create batch")
        
    created_batch_data = result.data[0]
    batch_uuid = created_batch_data["id"]

    # Log BATCH_CREATED if created by Coordinator
    if current_user.get("role") == "COORDINATOR":
        try:
            db.table("notifications").insert({
                "type": "BATCH_CREATED",
                "message": f"New batch '{batch_data.batchName}' created by Coordinator {current_user.get('fullName', 'User')}.",
                "is_read": False,
                "created_at": datetime.utcnow().isoformat()
            }).execute()
        except Exception as notif_err:
            print(f"[Warn] Failed to create BATCH_CREATED notification: {notif_err}")
    
    # Process trainees list if provided
    trainees_count = 0
    if hasattr(batch_data, "trainees") and batch_data.trainees:
        for trainee in batch_data.trainees:
            email = trainee.email.strip().lower()
            fullName = trainee.fullName.strip()
            
            # Check if user already exists
            existing_user = db.table("users").select("*").eq("email", email).execute()
            if existing_user.data:
                # User already exists
                user_row = existing_user.data[0]
                user_id = user_row["id"]
                current_batches = user_row.get("assigned_batches", []) or []
                if batch_uuid not in current_batches:
                    current_batches.append(batch_uuid)
                    db.table("users").update({"assigned_batches": current_batches}).eq("id", user_id).execute()
                
                # Check if they are already mapped as a candidate in this batch
                existing_cand = db.table("candidates").select("*").eq("email", email).eq("batch_id", batch_uuid).execute()
                if not existing_cand.data:
                    # Always generate a new unique registration number to satisfy the database unique constraint
                    emp_id = get_next_employee_id(db)
                    
                    candidate = Candidate(
                        email=email,
                        fullName=fullName,
                        registrationNumber=emp_id,
                        batchId=batch_uuid
                    )
                    db.table("candidates").insert(candidate.to_dict()).execute()
                    trainees_count += 1
            else:
                # User is new, create user with role TRAINEE
                emp_id = get_next_employee_id(db)
                temp_password = generate_temp_password()
                password_hash = hash_password(temp_password)
                
                new_user = {
                    "email": email,
                    "full_name": fullName,
                    "password_hash": password_hash,
                    "role": "TRAINEE",
                    "assigned_batches": [batch_uuid],
                    "is_active": True
                }
                
                user_insert = db.table("users").insert(new_user).execute()
                
                # Insert candidate mapping
                candidate = Candidate(
                    email=email,
                    fullName=fullName,
                    registrationNumber=emp_id,
                    batchId=batch_uuid
                )
                db.table("candidates").insert(candidate.to_dict()).execute()
                trainees_count += 1
                
                # Send credentials onboarding email via background task
                background_tasks.add_task(
                    EmailService.send_trainee_credentials,
                    candidate_email=email,
                    candidate_name=fullName,
                    employee_id=emp_id,
                    temp_password=temp_password
                )
                
        # Update batches count in batches table
        if trainees_count > 0:
            db.table("batches").update({"candidates_count": trainees_count}).eq("id", batch_uuid).execute()
            # Also update returned response dict
            created_batch_data["candidates_count"] = trainees_count
            
    created_batch = row_to_api(created_batch_data)
    return BatchResponse(**created_batch)

@router.get("/list", response_model=List[BatchResponse])
async def list_batches(current_user: dict = Depends(get_current_user)):
    """Get all batches"""
    db = get_db()
    
    result = db.table("batches").select("*").execute()
    batches_list = [row_to_api(batch) for batch in result.data]
    
    role = current_user.get("role")
    user_id = current_user.get("sub") or current_user.get("email") or ""
    
    if role == "COORDINATOR":
        filtered = []
        for b in batches_list:
            creator = b.get("createdBy")
            is_original = not creator and user_id in ["df772f20-b396-4a3b-8ddc-68fcd54b6060", "728f45b3-f6bd-4cfa-860f-a42c89682b33"]
            if creator == user_id or is_original:
                filtered.append(b)
        batches_list = filtered
    elif role == "TRAINER":
        # Trainers should only see batches assigned to them
        trainer_name = ""
        try:
            user_res = db.table("users").select("full_name").eq("id", current_user.get("sub")).execute()
            if user_res.data:
                trainer_name = user_res.data[0]["full_name"]
        except Exception:
            pass
        
        filtered = []
        for b in batches_list:
            trainers = b.get("trainers", []) or []
            if trainer_name in trainers or current_user.get("email") in trainers:
                filtered.append(b)
        batches_list = filtered
        
    return [BatchResponse(**b) for b in batches_list]

@router.get("/{batch_id}", response_model=BatchResponse)
async def get_batch(batch_id: str, current_user: dict = Depends(get_current_user)):
    """Get batch by ID"""
    db = get_db()
    
    try:
        result = db.table("batches").select("*").eq("id", batch_id).execute()
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch not found"
            )
        batch_data = row_to_api(result.data[0])
        role = current_user.get("role")
        user_id = current_user.get("sub") or current_user.get("email") or ""
        if role == "COORDINATOR":
            creator = batch_data.get("createdBy")
            is_original = not creator and user_id in ["df772f20-b396-4a3b-8ddc-68fcd54b6060", "728f45b3-f6bd-4cfa-860f-a42c89682b33"]
            if creator != user_id and not is_original:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this batch"
                )
        return BatchResponse(**batch_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{batch_id}", response_model=BatchResponse)
async def update_batch(batch_id: str, batch_data: BatchUpdate, current_user: dict = Depends(has_role("ADMIN", "COORDINATOR"))):
    """Update batch"""
    db = get_db()
    
    try:
        # Fetch current batch to get existing description
        existing = db.table("batches").select("*").eq("id", batch_id).execute()
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch not found"
            )
        
        current_batch_row = existing.data[0]
        current_desc_str = current_batch_row.get("description")
        
        existing_creator = ""
        if current_desc_str:
            try:
                parsed = json.loads(current_desc_str)
                if isinstance(parsed, dict):
                    existing_text = parsed.get("text", current_desc_str)
                    existing_topics = parsed.get("topics", [])
                    existing_size_limit = parsed.get("sizeLimit")
                    existing_questions = parsed.get("questions", [])
                    existing_creator = parsed.get("created_by", "")
            except Exception:
                existing_text = current_desc_str
        
        raw = batch_data.model_dump(exclude_unset=True)
        
        # Check trainer overlap constraints for update
        new_start = to_naive_utc(batch_data.startDate) if batch_data.startDate is not None else to_naive_utc(current_batch_row.get("start_date"))
        new_end = to_naive_utc(batch_data.endDate) if batch_data.endDate is not None else to_naive_utc(current_batch_row.get("end_date"))
        trainers_to_check = batch_data.trainers if batch_data.trainers is not None else (current_batch_row.get("trainers") or [])
        
        new_status = raw.get("status")
        new_status_val = new_status.value if hasattr(new_status, 'value') else new_status
        is_closing = new_status_val == "CLOSED" or (not new_status_val and current_batch_row.get("status") == "CLOSED")
        
        if trainers_to_check and new_start and new_end and not is_closing:
            # Fetch all other batches
            other_batches_res = db.table("batches").select("*").execute()
            other_batches = other_batches_res.data or []
            
            for trainer in trainers_to_check:
                trainer_clean = trainer.strip().lower()
                if not trainer_clean:
                    continue
                    
                for ob in other_batches:
                    # Skip the current batch itself
                    if ob.get("id") == batch_id:
                        continue
                    # Skip closed batches
                    if ob.get("status") == "CLOSED":
                        continue
                        
                    ob_trainers = ob.get("trainers", []) or []
                    ob_trainers_clean = [t.strip().lower() for t in ob_trainers]
                    
                    if trainer_clean in ob_trainers_clean:
                        ob_start = to_naive_utc(ob.get("start_date"))
                        ob_end = to_naive_utc(ob.get("end_date"))
                        
                        if ob_start and ob_end:
                            # Overlap formula: S1 <= E2 and S2 <= E1
                            if ob_start <= new_end and new_start <= ob_end:
                                raise HTTPException(
                                    status_code=status.HTTP_400_BAD_REQUEST,
                                    detail=f"Trainer '{trainer}' is already assigned to batch '{ob.get('batch_name')}' from {ob_start.date()} to {ob_end.date()} which overlaps with this duration."
                                )
        
        user_id = current_user.get("sub") or current_user.get("email") or ""
        if current_user.get("role") == "COORDINATOR":
            is_original = not existing_creator and user_id in ["df772f20-b396-4a3b-8ddc-68fcd54b6060", "728f45b3-f6bd-4cfa-860f-a42c89682b33"]
            if existing_creator != user_id and not is_original:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this batch"
                )
        
        updated_text = raw.get("description", existing_text)
        updated_topics = raw.get("topics", existing_topics)
        updated_size_limit = raw.get("sizeLimit", existing_size_limit)
        updated_questions = raw.get("questions", existing_questions)
        
        updated_desc_json = {
            "text": updated_text,
            "topics": updated_topics,
            "sizeLimit": updated_size_limit,
            "questions": updated_questions,
            "created_by": existing_creator
        }
        updated_desc_str = json.dumps(updated_desc_json)
        
        update_data = {}
        field_map = {
            "batchName": "batch_name",
            "startDate": "start_date",
            "endDate": "end_date",
        }
        
        for key, value in raw.items():
            if key in ["description", "topics", "sizeLimit", "questions"]:
                continue
            db_key = field_map.get(key, key)
            if isinstance(value, datetime):
                update_data[db_key] = value.isoformat()
            elif hasattr(value, 'value'):  # Enum
                update_data[db_key] = value.value
            else:
                update_data[db_key] = value
        
        # Always set description to the updated serialized JSON string
        update_data["description"] = updated_desc_str
        
        old_status = current_batch_row.get("status")
        new_status = raw.get("status")
        new_status_val = new_status.value if hasattr(new_status, 'value') else new_status

        result = db.table("batches").update(update_data).eq("id", batch_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch not found"
            )
            
        # Log BATCH_STATUS_CHANGED if status changed
        if new_status_val and old_status != new_status_val:
            try:
                db.table("notifications").insert({
                    "type": "BATCH_STATUS_CHANGED",
                    "message": f"Batch '{current_batch_row.get('batch_name', 'Unknown')}' status changed from {old_status} to {new_status_val}.",
                    "is_read": False,
                    "created_at": datetime.utcnow().isoformat()
                }).execute()
            except Exception as status_err:
                print(f"[Warn] Failed to create BATCH_STATUS_CHANGED notification: {status_err}")
        
        return BatchResponse(**row_to_api(result.data[0]))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{batch_id}")
async def delete_batch(batch_id: str, current_user: dict = Depends(has_role("ADMIN", "COORDINATOR"))):
    """Delete batch"""
    db = get_db()
    
    try:
        # Fetch current batch to check creator
        existing = db.table("batches").select("*").eq("id", batch_id).execute()
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch not found"
            )
            
        current_batch_row = existing.data[0]
        current_desc_str = current_batch_row.get("description")
        
        existing_creator = ""
        if current_desc_str:
            try:
                parsed = json.loads(current_desc_str)
                if isinstance(parsed, dict):
                    existing_creator = parsed.get("created_by", "")
            except Exception:
                pass
                
        user_id = current_user.get("sub") or current_user.get("email") or ""
        if current_user.get("role") == "COORDINATOR":
            is_original = not existing_creator and user_id in ["df772f20-b396-4a3b-8ddc-68fcd54b6060", "728f45b3-f6bd-4cfa-860f-a42c89682b33"]
            if existing_creator != user_id and not is_original:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this batch"
                )

        # Delete associated data first (cascade should handle this, but being explicit)
        db.table("assessments").delete().eq("batch_id", batch_id).execute()
        db.table("attendances").delete().eq("batch_id", batch_id).execute()
        db.table("candidates").delete().eq("batch_id", batch_id).execute()
        
        result = db.table("batches").delete().eq("id", batch_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch not found"
            )
        
        return {"message": "Batch deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{batch_id}/candidates", response_model=CandidateResponse)
async def add_candidate(batch_id: str, candidate_data: CandidateCreate, background_tasks: BackgroundTasks, current_user: dict = Depends(has_role("COORDINATOR", "TRAINER"))):
    """Add candidate to batch"""
    db = get_db()
    
    try:
        # Check if batch exists
        batch_result = db.table("batches").select("*").eq("id", batch_id).execute()
        if not batch_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch not found"
            )
            
        # Check permissions for Coordinator
        role = current_user.get("role")
        user_id = current_user.get("sub") or current_user.get("email") or ""
        if role == "COORDINATOR":
            batch_data = row_to_api(batch_result.data[0])
            creator = batch_data.get("createdBy")
            is_original = not creator and user_id in ["df772f20-b396-4a3b-8ddc-68fcd54b6060", "728f45b3-f6bd-4cfa-860f-a42c89682b33"]
            if creator != user_id and not is_original:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this batch"
                )
                
        email = candidate_data.email.strip().lower()
        fullName = candidate_data.fullName.strip()
        
        # Check if candidate already exists in this batch
        existing_cand = db.table("candidates").select("*").eq("email", email).eq("batch_id", batch_id).execute()
        if existing_cand.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Trainee is already enrolled in this batch"
            )
            
        # Check if user already exists in users table
        existing_user = db.table("users").select("*").eq("email", email).execute()
        if existing_user.data:
            user_row = existing_user.data[0]
            user_uuid = user_row["id"]
            current_batches = user_row.get("assigned_batches", []) or []
            if batch_id not in current_batches:
                current_batches.append(batch_id)
                db.table("users").update({"assigned_batches": current_batches}).eq("id", user_uuid).execute()
            emp_id = get_next_employee_id(db)
        else:
            emp_id = get_next_employee_id(db)
            temp_password = generate_temp_password()
            password_hash = hash_password(temp_password)
            
            new_user = {
                "email": email,
                "full_name": fullName,
                "password_hash": password_hash,
                "role": "TRAINEE",
                "assigned_batches": [batch_id],
                "is_active": True
            }
            db.table("users").insert(new_user).execute()
            
            # Send temp password email in background
            background_tasks.add_task(
                EmailService.send_trainee_credentials,
                candidate_email=email,
                candidate_name=fullName,
                employee_id=emp_id,
                temp_password=temp_password
            )
            
        candidate = Candidate(
            email=email,
            fullName=fullName,
            registrationNumber=emp_id,
            batchId=batch_id,
            phone=candidate_data.phone
        )
        
        result = db.table("candidates").insert(candidate.to_dict()).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to add candidate")
            
        # Update batch candidate count
        batch = db.table("batches").select("candidates_count").eq("id", batch_id).execute()
        current_count = batch.data[0]["candidates_count"] if batch.data else 0
        db.table("batches").update({"candidates_count": current_count + 1}).eq("id", batch_id).execute()
        
        created_candidate = row_to_api(result.data[0])
        return CandidateResponse(**created_candidate)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{batch_id}/candidates", response_model=List[CandidateResponse])
async def get_batch_candidates(batch_id: str, current_user: dict = Depends(get_current_user)):
    """Get all candidates in a batch"""
    db = get_db()
    
    result = db.table("candidates").select("*").eq("batch_id", batch_id).execute()
    return [CandidateResponse(**row_to_api(c)) for c in result.data]

@router.get("/{batch_id}/attendance-summary", response_model=List[AttendanceBatchResponse])
async def get_batch_attendance_summary(batch_id: str, current_user: dict = Depends(get_current_user)):
    """Get attendance summary for batch"""
    db = get_db()
    
    try:
        result = db.table("attendances").select("*").eq("batch_id", batch_id).execute()
        attendances = result.data
        
        # Group by date
        date_summary = {}
        for attendance in attendances:
            # Parse date and get just the date portion
            att_date = attendance["date"]
            if isinstance(att_date, str):
                date_key = att_date[:10]  # Get YYYY-MM-DD
            else:
                date_key = att_date.date().isoformat()
            
            if date_key not in date_summary:
                date_summary[date_key] = {
                    "date": attendance["date"],
                    "presentCount": 0,
                    "absentCount": 0,
                    "leaveCount": 0
                }
            
            att_status = attendance["status"]
            if att_status == "PRESENT":
                date_summary[date_key]["presentCount"] += 1
            elif att_status == "ABSENT":
                date_summary[date_key]["absentCount"] += 1
            elif att_status == "LEAVE":
                date_summary[date_key]["leaveCount"] += 1
        
        return [AttendanceBatchResponse(**summary) for summary in date_summary.values()]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/generate-curriculum", response_model=CurriculumSuggestionResponse)
async def generate_curriculum(
    req: CurriculumGenerateRequest,
    current_user: dict = Depends(has_role("ADMIN", "COORDINATOR"))
):
    """Generate topics and subtopics for a batch based on its name using Gemini 2.5 Flash via Langchain"""
    from app.core.config import settings
    from langchain_google_genai import ChatGoogleGenerativeAI
    from pydantic import BaseModel, Field
    
    # Check Gemini API key
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your_gemini_api_key_here" or settings.GEMINI_API_KEY.strip() == "":
        raise HTTPException(
            status_code=400,
            detail="Gemini API Key is not configured. Please add GEMINI_API_KEY to your .env file."
        )
        
    prompt = f"""You are a senior technical curriculum designer. Your task is to design a high-quality, comprehensive course curriculum based on the batch name.
   
    Batch Name: {req.batchName}
   
    Requirements:
    1. Generate exactly {req.topicsCount} distinct topic groups.
    2. For each topic group, generate exactly {req.subtopicsCount} comprehensive subtopics.
    3. Make sure the topics are ordered logically for learning.
    """
    
    try:
        # Define internal schema matching schemas.py structures for output validation
        class AI_TopicSuggestion(BaseModel):
            topic: str = Field(description="The title of the curriculum topic")
            subtopics: List[str] = Field(description=f"Exactly {req.subtopicsCount} subtopics")

        class AI_CurriculumSuggestionResponse(BaseModel):
            curriculum: List[AI_TopicSuggestion] = Field(description=f"List of exactly {req.topicsCount} topics")
            
        llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.3
        )
        
        structured_llm = llm.with_structured_output(AI_CurriculumSuggestionResponse)
        response = await structured_llm.ainvoke(prompt)
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI curriculum generation failed: {str(e)}")

