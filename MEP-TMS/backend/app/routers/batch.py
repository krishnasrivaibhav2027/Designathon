from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks
from typing import List
from app.schemas.schemas import (
    BatchCreate, BatchUpdate, BatchResponse, 
    CandidateCreate, CandidateResponse,
    AttendanceBatchResponse, CurriculumGenerateRequest,
    CurriculumSuggestionResponse
)
from app.core.database import get_db
from app.core.security import get_current_user, has_role, hash_password, check_batch_access
from app.models.models import Batch, Candidate, BatchStatus, row_to_api
from app.services.email_service import EmailService
from app.services.report_card_service import ReportCardService
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

def _map_pool_trainees_to_batch_db(db, batch_uuid: str, trainees_to_assign: list, target_status: str, background_tasks: BackgroundTasks):
    from app.core.security import hash_password
    # Pre-fetch batch details to optimize database calls in the loop
    batch_res = db.table("batches").select("*").eq("id", batch_uuid).execute()
    batch_dict = batch_res.data[0] if batch_res.data else {}
    
    assigned_count = 0
    candidates_info = []
    for t in trainees_to_assign:
        email = t["email"].strip().lower()
        fullName = t["full_name"].strip()
        college = t.get("college")
        phone = t.get("phone")
        emp_id = t.get("registration_number")
        
        existing_user = db.table("users").select("*").eq("email", email).execute()
        if existing_user.data:
            user_row = existing_user.data[0]
            user_uuid = user_row["id"]
            current_batches = user_row.get("assigned_batches", []) or []
            if batch_uuid not in current_batches:
                current_batches.append(batch_uuid)
                db.table("users").update({"assigned_batches": current_batches}).eq("id", user_uuid).execute()
            if not emp_id:
                emp_id = user_row.get("employee_id") or get_next_employee_id(db)
        else:
            if not emp_id:
                emp_id = get_next_employee_id(db)
            temp_password = generate_temp_password()
            password_hash = hash_password(temp_password)
            
            new_user = {
                "email": email,
                "full_name": fullName,
                "password_hash": password_hash,
                "role": "TRAINEE",
                "assigned_batches": [batch_uuid],
                "is_active": True,
                "employee_id": emp_id,
                "is_first_login": True
            }
            db.table("users").insert(new_user).execute()
            
            background_tasks.add_task(
                EmailService.send_trainee_credentials,
                candidate_email=email,
                candidate_name=fullName,
                employee_id=emp_id,
                temp_password=temp_password
            )
            
        existing_cand_any = db.table("candidates").select("*").eq("email", email).execute()
        if existing_cand_any.data:
            cand_res = db.table("candidates").update({"batch_id": batch_uuid}).eq("email", email).execute()
        else:
            candidate = Candidate(
                email=email,
                fullName=fullName,
                registrationNumber=emp_id,
                batchId=batch_uuid,
                phone=phone
            )
            payload = candidate.to_dict()
            try:
                cand_res = db.table("candidates").insert(payload).execute()
            except Exception as insert_err:
                if "progress" in str(insert_err):
                    payload.pop("progress", None)
                    cand_res = db.table("candidates").insert(payload).execute()
                else:
                    raise
            
        if cand_res.data:
            candidates_info.append({
                "id": cand_res.data[0]["id"],
                "name": fullName,
                "email": email,
                "college": college
            })
                
        db.table("trainee_pool").update({
            "status": target_status,
            "current_batch_id": batch_uuid
        }).eq("id", t["id"]).execute()
        
        assigned_count += 1
        
    if candidates_info:
        background_tasks.add_task(
            ReportCardService.bg_create_report_cards,
            batch_uuid,
            candidates_info,
            batch_dict
        )
    return assigned_count

@router.get("/min-size-limit")
async def get_min_size_limit(current_user: dict = Depends(get_current_user)):
    """Retrieve the configured minimum batch size limit"""
    from app.core.system_settings import get_setting
    return {"minBatchSizeLimit": get_setting("MIN_BATCH_SIZE_LIMIT", 30)}

@router.post("/create", response_model=BatchResponse)
async def create_batch(batch_data: BatchCreate, background_tasks: BackgroundTasks, current_user: dict = Depends(has_role("ADMIN", "COORDINATOR"))):
    """Create a new batch"""
    db = get_db()
    from app.core.system_settings import get_setting
    min_threshold = get_setting("MIN_BATCH_SIZE_LIMIT", 30)
    if batch_data.sizeLimit is not None and batch_data.sizeLimit < min_threshold:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Batch size limit must be at least {min_threshold} trainees."
        )
    
    is_spark_phase_1 = (batch_data.category == "SPARK" and (batch_data.phase == "PHASE_1" or batch_data.phase is None))
    if is_spark_phase_1 and (not batch_data.onboardingDate or not batch_data.onboardingDate.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trainee onboarding date pool is required for Spark Phase 1 batches."
        )

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
        createdBy=creator_id,
        category=batch_data.category,
        phase=batch_data.phase,
        onboardingDate=batch_data.onboardingDate
    )
    
    result = db.table("batches").insert(batch.to_dict()).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create batch")
        
    created_batch_data = result.data[0]
    batch_uuid = created_batch_data["id"]

    # Process date-basis onboarding pool if provided
    warning_flag = False
    warning_msg = None
    assigned_count = 0
    
    if batch_data.onboardingDate:
        from app.services.pool_cleanup import clean_and_sync_pool
        clean_and_sync_pool(db)
        category = batch_data.category or "SPARK"
        phase = batch_data.phase
        
        source_status = "UNASSIGNED"
        target_status = "SPARK_1"
        
        if category == "SPARK":
            if phase == "PHASE_2":
                source_status = "FOUNDATION"
                target_status = "SPARK_2"
            else:
                source_status = "UNASSIGNED"
                target_status = "SPARK_1"
        elif category == "FOUNDATIONAL":
            source_status = "SPARK_1"
            target_status = "FOUNDATION"
        elif category == "STREAM":
            source_status = "SPARK_2"
            target_status = "STREAM"
            
        pool_res = db.table("trainee_pool").select("*").eq("onboarding_date", batch_data.onboardingDate).eq("status", source_status).execute()
        pool_trainees = pool_res.data or []
        
        role = current_user.get("role")
        if role == "COORDINATOR" and pool_trainees:
            from app.core.system_settings import get_setting
            coord_trainees = get_setting("COORDINATOR_TRAINEES", {})
            coord_emails = {em.strip().lower() for em in coord_trainees.get(creator_id, []) if em} if isinstance(coord_trainees, dict) else set()
            pool_trainees = [t for t in pool_trainees if t.get("email", "").strip().lower() in coord_emails]
        
        if pool_trainees:
            size_limit = batch_data.sizeLimit
            trainees_to_assign = pool_trainees
            
            original_start_date = to_naive_utc(batch_data.startDate)
            original_end_date = to_naive_utc(batch_data.endDate)
            duration = original_end_date - original_start_date if original_start_date and original_end_date else None
            
            if size_limit is not None and size_limit > 0:
                if len(trainees_to_assign) > size_limit:
                    if batch_data.autoSplit and duration:
                        # Auto-split!
                        from app.core.system_settings import get_setting
                        MIN_BATCH_SIZE_LIMIT = get_setting("MIN_BATCH_SIZE_LIMIT", 30)
                        
                        R = len(trainees_to_assign) - size_limit
                        valid_k = None
                        for k in range(1, (R // MIN_BATCH_SIZE_LIMIT) + 2):
                            if MIN_BATCH_SIZE_LIMIT * k <= R <= size_limit * k:
                                valid_k = k
                                break
                                
                        if not valid_k:
                            warning_flag = True
                            warning_msg = f"Trainees exceed batch size limit of {size_limit}. Splitting is mathematically impossible because the remaining {R} trainees cannot form batches of size >= {MIN_BATCH_SIZE_LIMIT} and <= {size_limit}. Creating single batch instead."
                            trainees_to_assign = pool_trainees[:size_limit]
                        else:
                            primary_trainees = pool_trainees[:size_limit]
                            overflow_trainees = pool_trainees[size_limit:]
                            
                            # Assign first size_limit to the primary batch
                            assigned_count = _map_pool_trainees_to_batch_db(db, batch_uuid, primary_trainees, target_status, background_tasks)
                            db.table("batches").update({"candidates_count": assigned_count}).eq("id", batch_uuid).execute()
                            created_batch_data["candidates_count"] = assigned_count
                            
                            # Distribute remainder into valid_k cohorts
                            base_size = R // valid_k
                            rem = R % valid_k
                            cohorts_trainees = []
                            start_idx = 0
                            for idx in range(valid_k):
                                size = base_size + (1 if idx < rem else 0)
                                cohorts_trainees.append(overflow_trainees[start_idx:start_idx + size])
                                start_idx += size
                                
                            # Create other batches sequentially
                            from datetime import timedelta
                            last_end_date = original_end_date
                            
                            desc_json = {}
                            if batch_data.description:
                                try:
                                    desc_json = json.loads(batch_data.description)
                                except Exception:
                                    desc_json = {"text": batch_data.description}
                            desc_json["sizeLimit"] = size_limit
                            desc_json["created_by"] = creator_id
                            
                            for i in range(1, valid_k + 1):
                                split_start = last_end_date + timedelta(days=batch_data.gapDays or 7)
                                split_end = split_start + duration
                                last_end_date = split_end
                                
                                # Generate session dates for the split batch
                                split_session_dates = []
                                try:
                                    curr = split_start
                                    while curr <= split_end:
                                        if curr.weekday() < 5:
                                            date_str = curr.strftime("%Y-%m-%d")
                                            PUBLIC_HOLIDAYS = {
                                                "2026-01-01", "2026-01-26", "2026-03-19", "2026-03-20", "2026-04-03",
                                                "2026-04-14", "2026-05-01", "2026-05-25", "2026-08-15", "2026-10-02",
                                                "2026-11-08", "2026-12-25"
                                            }
                                            if date_str not in PUBLIC_HOLIDAYS:
                                                split_session_dates.append(date_str)
                                        curr += timedelta(days=1)
                                except Exception as e:
                                    print(f"Failed to generate split session dates: {e}")
                                    
                                split_desc_json = desc_json.copy()
                                split_desc_json["topics"] = batch_data.topics
                                split_desc_json["session_dates"] = split_session_dates
                                
                                new_batch_uuid = str(uuid.uuid4())
                                new_batch_id_str = f"BATCH-{uuid.uuid4().hex[:8].upper()}"
                                split_name = f"{batch_data.batchName} - Split {i}"
                                
                                new_batch_row = {
                                    "id": new_batch_uuid,
                                    "batch_id": new_batch_id_str,
                                    "batch_name": split_name,
                                    "start_date": split_start.isoformat() + "Z",
                                    "end_date": split_end.isoformat() + "Z",
                                    "status": "PLANNED",
                                    "trainers": [],  # Leave unassigned — coordinator picks available trainers for each split's date range
                                    "description": json.dumps(split_desc_json),
                                    "category": batch_data.category,
                                    "phase": batch_data.phase,
                                    "onboarding_date": batch_data.onboardingDate,
                                    "candidates_count": len(cohorts_trainees[i-1])
                                }
                                db.table("batches").insert(new_batch_row).execute()
                                
                                # Assign this split's trainees
                                _map_pool_trainees_to_batch_db(db, new_batch_uuid, cohorts_trainees[i-1], target_status, background_tasks)
                                
                                if current_user.get("role") == "COORDINATOR":
                                    try:
                                        db.table("notifications").insert({
                                            "type": "BATCH_CREATED",
                                            "message": f"New split batch '{split_name}' created by Coordinator {current_user.get('fullName', 'User')}.",
                                            "is_read": False,
                                            "created_at": datetime.utcnow().isoformat()
                                        }).execute()
                                    except Exception as notif_err:
                                        print(f"[Warn] Failed to create BATCH_CREATED notification for split: {notif_err}")
                                        
                            trainees_to_assign = [] # Skip normal flow
                    else:
                        warning_flag = True
                        warning_msg = f"The selected pool size exceeds the maximum batch limit of {size_limit}. Please schedule another batch for the same onboarding date for the remaining trainees."
                        trainees_to_assign = pool_trainees[:size_limit]
                        
            if trainees_to_assign:
                assigned_count = _map_pool_trainees_to_batch_db(db, batch_uuid, trainees_to_assign, target_status, background_tasks)
                db.table("batches").update({"candidates_count": assigned_count}).eq("id", batch_uuid).execute()
                created_batch_data["candidates_count"] = assigned_count

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
            
    created_batch = row_to_api(created_batch_data)
    created_batch["warning"] = warning_flag
    created_batch["warningMessage"] = warning_msg
    return BatchResponse(**created_batch)

@router.get("/list", response_model=List[BatchResponse])
async def list_batches(current_user: dict = Depends(get_current_user)):
    """Get all batches"""
    db = get_db()
    
    result = db.table("batches").select("*").execute()
    
    # Real-time automatic transition of PLANNED batches reaching start date
    today_utc = datetime.utcnow().date()
    for batch_item in result.data:
        if batch_item.get("status") == "PLANNED":
            sd_str = batch_item.get("start_date")
            if sd_str:
                try:
                    if "T" in sd_str:
                        sd_val = datetime.fromisoformat(sd_str.replace("Z", "+00:00")).date()
                    else:
                        sd_val = datetime.strptime(sd_str[:10], "%Y-%m-%d").date()
                    
                    if sd_val <= today_utc:
                        # Auto-transition status to RUNNING
                        db.table("batches").update({"status": "RUNNING"}).eq("id", batch_item["id"]).execute()
                        batch_item["status"] = "RUNNING"
                        
                        # Log notification
                        try:
                            db.table("notifications").insert({
                                "type": "BATCH_STATUS_CHANGED",
                                "message": f"Batch '{batch_item.get('batch_name')}' automatically transitioned to RUNNING as it reached its start date ({sd_str[:10]}).",
                                "is_read": False,
                                "created_at": datetime.utcnow().isoformat()
                            }).execute()
                        except Exception as notif_err:
                            print(f"[Warn] Failed to auto-create notification: {notif_err}")
                except Exception as ex:
                    print(f"[Error] Failed to auto-transition batch status: {ex}")
                    
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
        
        # Real-time automatic transition of PLANNED batch reaching start date
        batch_row = result.data[0]
        if batch_row.get("status") == "PLANNED":
            sd_str = batch_row.get("start_date")
            if sd_str:
                try:
                    if "T" in sd_str:
                        sd_val = datetime.fromisoformat(sd_str.replace("Z", "+00:00")).date()
                    else:
                        sd_val = datetime.strptime(sd_str[:10], "%Y-%m-%d").date()
                    
                    today_utc = datetime.utcnow().date()
                    if sd_val <= today_utc:
                        db.table("batches").update({"status": "RUNNING"}).eq("id", batch_id).execute()
                        batch_row["status"] = "RUNNING"
                        
                        try:
                            db.table("notifications").insert({
                                "type": "BATCH_STATUS_CHANGED",
                                "message": f"Batch '{batch_row.get('batch_name')}' automatically transitioned to RUNNING as it reached its start date ({sd_str[:10]}).",
                                "is_read": False,
                                "created_at": datetime.utcnow().isoformat()
                            }).execute()
                        except Exception:
                            pass
                except Exception:
                    pass

        batch_data = row_to_api(batch_row)
        check_batch_access(db, current_user, batch_id)
        return BatchResponse(**batch_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{batch_id}", response_model=BatchResponse)
async def update_batch(batch_id: str, batch_data: BatchUpdate, current_user: dict = Depends(has_role("ADMIN", "COORDINATOR"))):
    """Update batch"""
    db = get_db()
    from app.core.system_settings import get_setting
    min_threshold = get_setting("MIN_BATCH_SIZE_LIMIT", 30)
    if batch_data.sizeLimit is not None and batch_data.sizeLimit < min_threshold:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Batch size limit must be at least {min_threshold} trainees."
        )
    
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
        existing_session_dates = []
        existing_agent = None
        if current_desc_str:
            try:
                parsed = json.loads(current_desc_str)
                if isinstance(parsed, dict):
                    existing_text = parsed.get("text", current_desc_str)
                    existing_topics = parsed.get("topics", [])
                    existing_size_limit = parsed.get("sizeLimit")
                    existing_questions = parsed.get("questions", [])
                    existing_creator = parsed.get("created_by", "")
                    existing_session_dates = parsed.get("session_dates", [])
                    existing_agent = parsed.get("agent", None)
            except Exception:
                existing_text = current_desc_str
        
        raw = batch_data.model_dump(exclude_unset=True)
        
        # Check if editing details is blocked based on start date or status
        old_status = current_batch_row.get("status")
        start_date_str = current_batch_row.get("start_date")
        start_date_reached = False
        if start_date_str:
            try:
                if "T" in start_date_str:
                    start_date_val = datetime.fromisoformat(start_date_str.replace("Z", "+00:00")).date()
                else:
                    start_date_val = datetime.strptime(start_date_str[:10], "%Y-%m-%d").date()
                
                today_utc = datetime.utcnow().date()
                if start_date_val <= today_utc:
                    start_date_reached = True
            except Exception:
                pass

        # We allow status updates, but block other edits if not in PLANNED or start date reached
        is_editing_details = False
        raw_keys = raw.keys()
        detail_fields = {"batchName", "startDate", "endDate", "trainers", "topics", "sizeLimit", "description", "questions"}
        if any(f in raw_keys for f in detail_fields):
            is_editing_details = True

        if is_editing_details:
            if old_status != "PLANNED":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Batch details can only be edited when the batch is in PLANNED status."
                )
            if start_date_reached:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Batch details cannot be edited once the start date is reached."
                )
        
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
        
        # Recalculate session dates if start date or end date is updated, or if they are missing
        if "startDate" in raw or "endDate" in raw or not existing_session_dates:
            from datetime import timedelta, datetime as datetime_cls
            start_dt = new_start
            end_dt = new_end
            
            PUBLIC_HOLIDAYS = {
                # 2025 holidays
                "2025-01-01", "2025-01-26", "2025-03-14", "2025-03-31", "2025-04-10", "2025-05-01", "2025-08-15", "2025-10-02", "2025-10-23", "2025-12-25",
                # 2026 holidays
                "2026-01-01",  # New Year's Day
                "2026-01-26",  # Republic Day
                "2026-03-19",  # Maha Shivratri (approx)
                "2026-03-20",  # Eid-ul-Fitr (approx)
                "2026-04-03",  # Good Friday (approx)
                "2026-04-14",  # Ambedkar Jayanti
                "2026-05-01",  # May Day / Labor Day
                "2026-05-25",  # Eid-al-Adha (approx)
                "2026-08-15",  # Independence Day
                "2026-10-02",  # Gandhi Jayanti
                "2026-11-08",  # Diwali / Deepavali (approx)
                "2026-12-25",  # Christmas
            }
            
            updated_session_dates = []
            try:
                curr = start_dt
                while curr <= end_dt:
                    if curr.weekday() < 5:
                        date_str = curr.strftime("%Y-%m-%d")
                        if date_str not in PUBLIC_HOLIDAYS:
                            updated_session_dates.append(date_str)
                    curr += timedelta(days=1)
            except Exception as e:
                print(f"[Warn] Failed to recalculate session dates: {e}")
                updated_session_dates = existing_session_dates
        else:
            updated_session_dates = existing_session_dates
            
        updated_desc_json = {
            "text": updated_text,
            "topics": updated_topics,
            "sizeLimit": updated_size_limit,
            "questions": updated_questions,
            "created_by": existing_creator,
            "session_dates": updated_session_dates,
            "agent": existing_agent
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

        # Determine previous status for trainees in pool
        category = current_batch_row.get("category") or "SPARK"
        phase = current_batch_row.get("phase")
        
        previous_status = "UNASSIGNED"
        if category == "SPARK":
            if phase == "PHASE_2":
                previous_status = "FOUNDATION"
            else:
                previous_status = "UNASSIGNED"
        elif category == "FOUNDATIONAL":
            previous_status = "SPARK_1"
        elif category == "STREAM":
            previous_status = "SPARK_2"
            
        # Reset trainee pool status for trainees mapped to this batch
        db.table("trainee_pool").update({
            "status": previous_status,
            "current_batch_id": None
        }).eq("current_batch_id", batch_id).execute()

        # Clean up assigned_batches for users associated with candidates of this batch
        candidates_res = db.table("candidates").select("email").eq("batch_id", batch_id).execute()
        if candidates_res.data:
            for cand in candidates_res.data:
                email = cand.get("email")
                if not email:
                    continue
                user_res = db.table("users").select("id", "assigned_batches").eq("email", email.strip().lower()).execute()
                if user_res.data:
                    user_row = user_res.data[0]
                    user_uuid = user_row["id"]
                    current_batches = user_row.get("assigned_batches", []) or []
                    if batch_id in current_batches:
                        updated_batches = [b for b in current_batches if b != batch_id]
                        db.table("users").update({"assigned_batches": updated_batches}).eq("id", user_uuid).execute()

        # Delete associated data first (cascade should handle this, but being explicit)
        db.table("assessments").delete().eq("batch_id", batch_id).execute()
        db.table("attendances").delete().eq("batch_id", batch_id).execute()
        db.table("candidates").delete().eq("batch_id", batch_id).execute()
        db.table("feedbacks").delete().eq("batch_id", batch_id).execute()
        db.table("spark_1_report_cards").delete().eq("batch_id", batch_id).execute()
        db.table("spark_2_report_cards").delete().eq("batch_id", batch_id).execute()
        db.table("foundation_report_cards").delete().eq("batch_id", batch_id).execute()
        db.table("stream_report_cards").delete().eq("batch_id", batch_id).execute()
        
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
            
        # Check permissions
        check_batch_access(db, current_user, batch_id)
                
        email = candidate_data.email.strip().lower()
        fullName = candidate_data.fullName.strip()
        
        # Check if candidate already exists in this batch (via user's assigned_batches or candidates table)
        already_in_batch = False
        existing_user_check = db.table("users").select("assigned_batches").eq("email", email).execute()
        if existing_user_check.data:
            assigned = existing_user_check.data[0].get("assigned_batches", []) or []
            if batch_id in assigned:
                already_in_batch = True
        
        if not already_in_batch:
            existing_cand = db.table("candidates").select("*").eq("email", email).eq("batch_id", batch_id).execute()
            if existing_cand.data:
                already_in_batch = True
                
        if already_in_batch:
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
            emp_id = user_row.get("employee_id") or get_next_employee_id(db)
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
                "is_active": True,
                "employee_id": emp_id,
                "is_first_login": True
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
            
        existing_cand_any = db.table("candidates").select("*").eq("email", email).execute()
        if existing_cand_any.data:
            result = db.table("candidates").update({"batch_id": batch_id}).eq("email", email).execute()
        else:
            candidate = Candidate(
                email=email,
                fullName=fullName,
                registrationNumber=emp_id,
                batchId=batch_id,
                phone=candidate_data.phone
            )
            payload = candidate.to_dict()
            try:
                result = db.table("candidates").insert(payload).execute()
            except Exception as insert_err:
                if "progress" in str(insert_err):
                    payload.pop("progress", None)
                    result = db.table("candidates").insert(payload).execute()
                else:
                    raise
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to add candidate")
            
        ReportCardService.create_report_cards_for_candidate(db, batch_id, result.data[0]["id"], fullName, email)
            
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
    check_batch_access(db, current_user, batch_id)
    
    # Query users where role is TRAINEE and assigned_batches contains batch_id
    users_res = db.table("users").select("email").eq("role", "TRAINEE").cs("assigned_batches", [batch_id]).execute()
    emails = {u["email"].strip().lower() for u in users_res.data} if users_res.data else set()
    
    # Also query candidates directly where batch_id matches
    cand_direct_res = db.table("candidates").select("email").eq("batch_id", batch_id).execute()
    if cand_direct_res.data:
        for c in cand_direct_res.data:
            emails.add(c["email"].strip().lower())
            
    if not emails:
        return []
        
    candidates_res = db.table("candidates").select("*").in_("email", list(emails)).execute()
    
    candidates_list = []
    for c in candidates_res.data:
        c_api = row_to_api(c)
        c_api["batchId"] = batch_id
        candidates_list.append(CandidateResponse(**c_api))
        
    # Sort by full name for consistency
    candidates_list.sort(key=lambda x: x.fullName.lower())
    return candidates_list

@router.get("/{batch_id}/attendance-summary", response_model=List[AttendanceBatchResponse])
async def get_batch_attendance_summary(batch_id: str, current_user: dict = Depends(get_current_user)):
    """Get attendance summary for batch"""
    db = get_db()
    check_batch_access(db, current_user, batch_id)
    
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
        
    is_spark = "spark" in req.batchName.lower()
    
    if is_spark:
        prompt = f"""You are a senior technical curriculum designer. Your task is to design a high-quality soft-skills and professional development curriculum for a corporate training cohort.
        
        Batch Name: {req.batchName}
        
        Since this is a Spark Phase cohort, you MUST use exactly the following 7 topics as your topic groups (in this exact order):
        1. Communication Skills
        2. Interpersonal Skills
        3. Business Etiquette
        4. Service Orientation
        5. Emotional Intelligence & Empathy
        6. Accountability & Ownership
        7. Presentation Skills
        
        Requirements:
        1. Generate exactly 7 topic groups, using the titles listed above.
        2. For each topic group, generate exactly {req.subtopicsCount} relevant and professional subtopics that fit corporate trainees.
        """
        topics_count = 7
    else:
        prompt = f"""You are a senior technical curriculum designer. Your task is to design a high-quality, comprehensive course curriculum based on the batch name.
       
        Batch Name: {req.batchName}
       
        Requirements:
        1. Generate exactly {req.topicsCount} distinct topic groups.
        2. For each topic group, generate exactly {req.subtopicsCount} comprehensive subtopics.
        3. Make sure the topics are ordered logically for learning.
        """
        topics_count = req.topicsCount
        
    try:
        # Define internal schema matching schemas.py structures for output validation
        class AI_TopicSuggestion(BaseModel):
            topic: str = Field(description="The title of the curriculum topic")
            subtopics: List[str] = Field(description=f"Exactly {req.subtopicsCount} subtopics")

        class AI_CurriculumSuggestionResponse(BaseModel):
            curriculum: List[AI_TopicSuggestion] = Field(description=f"List of exactly {topics_count} topics")
            
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

