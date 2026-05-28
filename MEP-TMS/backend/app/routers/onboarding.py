import io
import csv
import openpyxl
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form, BackgroundTasks
from app.core.database import get_db
from app.core.security import get_current_user, has_role, hash_password
from app.models.models import Candidate, row_to_api
from app.services.pool_cleanup import clean_and_sync_pool
from app.services.email_service import EmailService
from app.services.report_card_service import ReportCardService
from app.schemas.schemas import TraineePoolResponse, TraineePoolAssignRequest
import uuid
import secrets
import string

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])

def get_next_employee_id(db) -> str:
    try:
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
    up = "".join(secrets.choice(string.ascii_uppercase) for _ in range(2))
    low = "".join(secrets.choice(string.ascii_lowercase) for _ in range(4))
    dig = "".join(secrets.choice(string.digits) for _ in range(2))
    return up + low + dig

def get_next_employee_id_value(db) -> int:
    max_val = 0
    try:
        res1 = db.table("candidates").select("registration_number").like("registration_number", "MAV-%").execute()
        if res1.data:
            for row in res1.data:
                reg_num = row.get("registration_number", "")
                if reg_num.startswith("MAV-"):
                    try:
                        max_val = max(max_val, int(reg_num.split("-")[1]))
                    except (IndexError, ValueError):
                        continue
    except:
        pass
    try:
        res2 = db.table("trainee_pool").select("registration_number").like("registration_number", "MAV-%").execute()
        if res2.data:
            for row in res2.data:
                reg_num = row.get("registration_number", "")
                if reg_num and reg_num.startswith("MAV-"):
                    try:
                        max_val = max(max_val, int(reg_num.split("-")[1]))
                    except (IndexError, ValueError):
                        continue
    except:
        pass
    return max_val

def get_coordinator_onboarding_dates(db, coordinator_id: str) -> set:
    """Get onboarding dates that this coordinator owns."""
    dates = set()
    
    # 1. Check all batches created by this coordinator
    try:
        batches_res = db.table("batches").select("onboarding_date, description").execute()
        import json
        for b in batches_res.data or []:
            desc_str = b.get("description")
            creator = ""
            if desc_str and desc_str.startswith("{"):
                try:
                    creator = json.loads(desc_str).get("created_by", "")
                except:
                    pass
            is_original = not creator and coordinator_id in ["df772f20-b396-4a3b-8ddc-68fcd54b6060", "728f45b3-f6bd-4cfa-860f-a42c89682b33"]
            if creator == coordinator_id or is_original:
                ob_date = b.get("onboarding_date")
                if ob_date:
                    dates.add(ob_date)
    except Exception as e:
        print(f"Error fetching coordinator batches for dates: {e}")

    # 2. Check settings for uploaded dates
    try:
        from app.core.system_settings import get_setting
        coord_pools = get_setting("COORDINATOR_POOLS", {})
        if isinstance(coord_pools, dict):
            user_dates = coord_pools.get(coordinator_id, [])
            for d in user_dates:
                dates.add(d)
    except Exception as e:
        print(f"Error reading COORDINATOR_POOLS setting: {e}")
        
    return dates


def get_coordinator_trainee_emails(coordinator_id: str) -> set:
    """Get trainee emails that this coordinator owns."""
    try:
        from app.core.system_settings import get_setting
        coord_trainees = get_setting("COORDINATOR_TRAINEES", {})
        if isinstance(coord_trainees, dict):
            return {em.strip().lower() for em in coord_trainees.get(coordinator_id, []) if em}
    except Exception as e:
        print(f"Error reading COORDINATOR_TRAINEES setting: {e}")
    return set()


@router.post("/upload")
async def upload_trainees(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    onboarding_date: str = Form(...),
    current_user: dict = Depends(has_role("ADMIN", "COORDINATOR"))
):
    db = get_db()
    contents = await file.read()
    
    trainees = []
    filename = file.filename.lower()
    
    if filename.endswith(".csv"):
        try:
            decoded = contents.decode("utf-8").splitlines()
            reader = csv.reader(decoded)
            rows = list(reader)
            if len(rows) < 2:
                raise HTTPException(status_code=400, detail="Empty or invalid CSV file.")
            
            headers = [h.strip().lower() for h in rows[0]]
            name_idx = -1
            email_idx = -1
            college_idx = -1
            phone_idx = -1
            skill_idx = -1
            
            for idx, h in enumerate(headers):
                if h in ["full name", "fullname", "name"] or "name" in h:
                    name_idx = idx
                elif h in ["email", "email address", "emailaddress", "mail"] or "mail" in h or "email" in h:
                    email_idx = idx
                elif "college" in h or "university" in h:
                    college_idx = idx
                elif "phone" in h or "mobile" in h or "contact" in h:
                    phone_idx = idx
                elif h in ["skill set", "skillset", "skill", "primary skill", "foundation language", "foundation_language"] or "skill" in h or "language" in h:
                    skill_idx = idx
            
            if name_idx == -1: name_idx = 0
            if email_idx == -1: email_idx = 1
            
            for row in rows[1:]:
                if not row or len(row) <= max(name_idx, email_idx):
                    continue
                name = row[name_idx].strip()
                email = row[email_idx].strip().lower()
                college = row[college_idx].strip() if college_idx != -1 and len(row) > college_idx else None
                phone = row[phone_idx].strip() if phone_idx != -1 and len(row) > phone_idx else None
                skillset = row[skill_idx].strip() if skill_idx != -1 and len(row) > skill_idx else None
                
                if name and email:
                    trainees.append({
                        "email": email,
                        "full_name": name,
                        "college": college,
                        "phone": phone,
                        "onboarding_date": onboarding_date,
                        "status": "UNASSIGNED",
                        "foundation_language": skillset
                    })
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")
            
    elif filename.endswith(".xlsx") or filename.endswith(".xls"):
        try:
            wb = openpyxl.load_workbook(io.BytesIO(contents))
            ws = wb.active
            
            headers = []
            for col in range(1, ws.max_column + 1):
                val = ws.cell(row=1, column=col).value
                headers.append(str(val).strip().lower() if val else "")
                
            name_idx = -1
            email_idx = -1
            college_idx = -1
            phone_idx = -1
            skill_idx = -1
            
            for idx, h in enumerate(headers, 1):
                if h in ["full name", "fullname", "name"] or "name" in h:
                    name_idx = idx
                elif h in ["email", "email address", "emailaddress", "mail"] or "mail" in h or "email" in h:
                    email_idx = idx
                elif "college" in h or "university" in h:
                    college_idx = idx
                elif "phone" in h or "mobile" in h or "contact" in h:
                    phone_idx = idx
                elif h in ["skill set", "skillset", "skill", "primary skill", "foundation language", "foundation_language"] or "skill" in h or "language" in h:
                    skill_idx = idx
                    
            if name_idx == -1: name_idx = 1
            if email_idx == -1: email_idx = 2
            
            for r_idx in range(2, ws.max_row + 1):
                name = ws.cell(row=r_idx, column=name_idx).value
                email = ws.cell(row=r_idx, column=email_idx).value
                college = ws.cell(row=r_idx, column=college_idx).value if college_idx != -1 else None
                phone = ws.cell(row=r_idx, column=phone_idx).value if phone_idx != -1 else None
                skillset = ws.cell(row=r_idx, column=skill_idx).value if skill_idx != -1 else None
                
                if name and email:
                    trainees.append({
                        "email": str(email).strip().lower(),
                        "full_name": str(name).strip(),
                        "college": str(college).strip() if college else None,
                        "phone": str(phone).strip() if phone else None,
                        "onboarding_date": onboarding_date,
                        "status": "UNASSIGNED",
                        "foundation_language": str(skillset).strip() if skillset else None
                    })
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse Excel: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload CSV or Excel.")
        
    if not trainees:
        raise HTTPException(status_code=400, detail="No trainees found in the uploaded file.")
        
    try:
        existing_res = db.table("trainee_pool").select("email").eq("onboarding_date", onboarding_date).execute()
        existing_emails = {r["email"].lower() for r in existing_res.data or []}
        
        users_res = db.table("users").select("email").execute()
        existing_user_emails = {r["email"].lower() for r in users_res.data or []}
        
        current_max = get_next_employee_id_value(db)
        
        to_insert = []
        seen = set()
        for t in trainees:
            em = t["email"]
            if em not in existing_emails and em not in seen:
                current_max += 1
                emp_id = f"MAV-{current_max:03d}"
                t["registration_number"] = emp_id
                
                to_insert.append(t)
                seen.add(em)
                
                # Create user account immediately
                if em not in existing_user_emails:
                    temp_password = generate_temp_password()
                    password_hash = hash_password(temp_password)
                    
                    new_user = {
                        "email": em,
                        "full_name": t["full_name"],
                        "password_hash": password_hash,
                        "role": "TRAINEE",
                        "assigned_batches": [],
                        "is_active": True,
                        "employee_id": emp_id,
                        "is_first_login": True
                    }
                    db.table("users").insert(new_user).execute()
                    existing_user_emails.add(em)
                    
                    background_tasks.add_task(
                        EmailService.send_trainee_credentials,
                        candidate_email=em,
                        candidate_name=t["full_name"],
                        employee_id=emp_id,
                        temp_password=temp_password
                    )
                
        if to_insert:
            db.table("trainee_pool").insert(to_insert).execute()
            
        # Record the onboarding date for the coordinator
        try:
            from app.core.system_settings import get_setting, update_settings
            coord_pools = get_setting("COORDINATOR_POOLS", {})
            if not isinstance(coord_pools, dict):
                coord_pools = {}
            
            coord_trainees = get_setting("COORDINATOR_TRAINEES", {})
            if not isinstance(coord_trainees, dict):
                coord_trainees = {}
            
            user_id = current_user.get("sub") or current_user.get("email") or ""
            if user_id not in coord_pools:
                coord_pools[user_id] = []
            if onboarding_date not in coord_pools[user_id]:
                coord_pools[user_id].append(onboarding_date)
                
            if user_id not in coord_trainees:
                coord_trainees[user_id] = []
            for t in trainees:
                em = t["email"].strip().lower()
                if em and em not in coord_trainees[user_id]:
                    coord_trainees[user_id].append(em)
                    
            update_settings({
                "COORDINATOR_POOLS": coord_pools,
                "COORDINATOR_TRAINEES": coord_trainees
            })
        except Exception as e:
            print(f"Failed to save coordinator pool and trainee mapping: {e}")
            
        return {"inserted": len(to_insert), "skipped": len(trainees) - len(to_insert)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database insert failed: {str(e)}")

@router.get("/dates")
async def get_onboarding_dates(current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        role = current_user.get("role")
        user_id = current_user.get("sub") or current_user.get("email") or ""
        
        if role == "COORDINATOR":
            coordinator_dates = get_coordinator_onboarding_dates(db, user_id)
            return sorted(list(coordinator_dates), reverse=True)
            
        res = db.table("trainee_pool").select("onboarding_date").execute()
        dates = sorted(list({r["onboarding_date"] for r in res.data or []}), reverse=True)
        return dates
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/pool")
async def get_trainee_pool(
    onboarding_date: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    try:
        role = current_user.get("role")
        user_id = current_user.get("sub") or current_user.get("email") or ""
        
        query = db.table("trainee_pool").select("*")
        
        coord_emails = None
        if role == "COORDINATOR":
            coord_emails = get_coordinator_trainee_emails(user_id)
            coordinator_dates = get_coordinator_onboarding_dates(db, user_id)
            if onboarding_date:
                if onboarding_date not in coordinator_dates:
                    return []
                query = query.eq("onboarding_date", onboarding_date)
            else:
                if coordinator_dates:
                    query = query.in_("onboarding_date", list(coordinator_dates))
                else:
                    return []
        else:
            if onboarding_date:
                query = query.eq("onboarding_date", onboarding_date)
        if status:
            query = query.eq("status", status)
            
        res = query.execute()
        
        mapped = []
        for row in res.data or []:
            email = row.get("email", "").strip().lower()
            if coord_emails is not None and email not in coord_emails:
                continue
            mapped.append({
                "id": row["id"],
                "email": row["email"],
                "fullName": row["full_name"],
                "college": row.get("college"),
                "phone": row.get("phone"),
                "onboardingDate": row["onboarding_date"],
                "status": row["status"],
                "currentBatchId": row.get("current_batch_id"),
                "foundationLanguage": row.get("foundation_language"),
                "streamTraining": row.get("stream_training"),
                "eliminatedPhase": row.get("eliminated_phase"),
                "createdAt": row["created_at"],
                "updatedAt": row["updated_at"]
            })
        return mapped
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/assign")
async def assign_trainees_to_batch(
    payload: TraineePoolAssignRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(has_role("ADMIN", "COORDINATOR"))
):
    from datetime import datetime, timedelta, timezone
    from app.core.system_settings import get_setting
    
    db = get_db()
    
    # Run clean and sync pool first
    clean_and_sync_pool(db)
    
    # Filter out any trainee IDs that have been ELIMINATED or are no longer active in pool
    if payload.traineeIds:
        active_pool_res = db.table("trainee_pool").select("id").in_("id", payload.traineeIds).not_.in_("status", ["ELIMINATED"]).execute()
        active_trainee_ids = [r["id"] for r in active_pool_res.data or []]
        payload.traineeIds = active_trainee_ids
        
    # Retrieve system settings minimum batch size limit threshold
    MIN_BATCH_SIZE_LIMIT = get_setting("MIN_BATCH_SIZE_LIMIT", 30)
    
    # Validation 1: Check minimum selected trainees from the pool
    N = len(payload.traineeIds)
    if N < MIN_BATCH_SIZE_LIMIT:
        raise HTTPException(
            status_code=400,
            detail=f"A minimum of {MIN_BATCH_SIZE_LIMIT} trainees must be selected to assign them to a batch."
        )
        
    batch_res = db.table("batches").select("*").eq("id", payload.batchId).execute()
    if not batch_res.data:
        raise HTTPException(status_code=404, detail="Batch not found")
    batch_data = batch_res.data[0]
    
    batch_id = batch_data["id"]
    category = batch_data.get("category", "SPARK") or "SPARK"
    phase = batch_data.get("phase")
    
    # Extract size limit from description JSON
    desc_str = batch_data.get("description")
    size_limit = MIN_BATCH_SIZE_LIMIT
    desc_json = {}
    if desc_str:
        import json
        try:
            desc_json = json.loads(desc_str)
            if isinstance(desc_json, dict):
                size_limit = desc_json.get("sizeLimit", MIN_BATCH_SIZE_LIMIT)
        except Exception:
            desc_json = {"text": desc_str}
            
    if size_limit is None or size_limit <= 0:
        size_limit = MIN_BATCH_SIZE_LIMIT
        
    current_candidates_count = batch_data.get("candidates_count") or 0
    available_slots = size_limit - current_candidates_count
    
    # If the cohort is already full and we selected candidates
    if available_slots <= 0:
        raise HTTPException(
            status_code=400,
            detail=f"This batch is already full. (Size limit: {size_limit}, Candidates enrolled: {current_candidates_count})"
        )
        
    # Helper to convert dates safely
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
        
    # Check if there is an overflow case
    if N > available_slots:
        # Overflow remainder
        R = N - available_slots
        
        # Calculate split possibility using partition formula:
        # MIN_BATCH_SIZE_LIMIT * k <= R <= size_limit * k
        valid_k = None
        for k in range(1, (R // MIN_BATCH_SIZE_LIMIT) + 2):
            if MIN_BATCH_SIZE_LIMIT * k <= R <= size_limit * k:
                valid_k = k
                break
                
        if not valid_k:
            raise HTTPException(
                status_code=400,
                detail=f"Capacity exceeded by {R} trainees. Cannot split the remaining trainees because each training batch must be between {MIN_BATCH_SIZE_LIMIT} and {size_limit} in size. Please select fewer trainees or adjust the batch size limit."
            )
            
        # If payload does not approve autoSplit, return recommendation details
        if not payload.autoSplit:
            return {
                "overflow": True,
                "availableSlots": available_slots,
                "remainingCount": R,
                "suggestedSplits": valid_k,
                "message": f"Capacity exceeded. Proceed to split the remaining {R} trainees into {valid_k} split cohorts?"
            }
            
        # Execute Auto-splitting cohort creation!
        # Step 1: Assign first 'available_slots' trainees to the original batch
        primary_ids = payload.traineeIds[:available_slots]
        overflow_ids = payload.traineeIds[available_slots:]
        
        # Map primary trainees
        _map_trainees_to_batch_db(db, batch_id, primary_ids, category, phase, background_tasks)
        db.table("batches").update({"candidates_count": size_limit}).eq("id", batch_id).execute()
        
        # Step 2: Distribute R trainees into valid_k cohorts as evenly as possible
        base_size = R // valid_k
        rem = R % valid_k
        cohorts_ids = []
        start_idx = 0
        for idx in range(valid_k):
            size = base_size + (1 if idx < rem else 0)
            cohorts_ids.append(overflow_ids[start_idx:start_idx + size])
            start_idx += size
            
        # Step 3: Sequential Creation & Enrolment
        original_start_date = to_naive_utc(batch_data.get("start_date"))
        original_end_date = to_naive_utc(batch_data.get("end_date"))
        duration = original_end_date - original_start_date
        
        last_end_date = original_end_date
        created_splits_info = []
        
        for i in range(1, valid_k + 1):
            split_start = last_end_date + timedelta(days=payload.gapDays)
            split_end = split_start + duration
            last_end_date = split_end
            
            new_batch_uuid = str(uuid.uuid4())
            new_batch_id_str = f"BATCH-{uuid.uuid4().hex[:8].upper()}"
            split_name = f"{batch_data.get('batch_name')} - Split {i}"
            
            desc_json["sizeLimit"] = size_limit
            
            new_batch = {
                "id": new_batch_uuid,
                "batch_id": new_batch_id_str,
                "batch_name": split_name,
                "start_date": split_start.isoformat() + "Z",
                "end_date": split_end.isoformat() + "Z",
                "status": "PLANNED",
                "trainers": batch_data.get("trainers", []),
                "topics": batch_data.get("topics", []),
                "description": json.dumps(desc_json),
                "created_by": batch_data.get("created_by"),
                "category": batch_data.get("category", "SPARK"),
                "phase": batch_data.get("phase"),
                "onboarding_date": batch_data.get("onboarding_date"),
                "candidates_count": len(cohorts_ids[i-1])
            }
            
            db.table("batches").insert(new_batch).execute()
            
            # Map this split's trainees
            _map_trainees_to_batch_db(db, new_batch_uuid, cohorts_ids[i-1], category, phase, background_tasks)
            
            # Log BATCH_CREATED notification
            try:
                db.table("notifications").insert({
                    "type": "BATCH_CREATED",
                    "message": f"Successfully created Split Cohort '{split_name}' with {len(cohorts_ids[i-1])} trainees.",
                    "is_read": False,
                    "created_at": datetime.utcnow().isoformat()
                }).execute()
            except Exception:
                pass
                
            created_splits_info.append({
                "batchName": split_name,
                "startDate": split_start.date().isoformat(),
                "endDate": split_end.date().isoformat(),
                "count": len(cohorts_ids[i-1])
            })
            
        return {
            "message": f"Successfully mapped {available_slots} trainees to the original batch, and split the remaining {R} trainees into {valid_k} split cohorts.",
            "assignedCount": N,
            "splitsCreated": valid_k,
            "splitsInfo": created_splits_info,
            "overflow": False
        }
    else:
        # Standard assignment (No overflow)
        assigned_count = _map_trainees_to_batch_db(db, batch_id, payload.traineeIds, category, phase, background_tasks)
        new_candidates_count = current_candidates_count + assigned_count
        db.table("batches").update({"candidates_count": new_candidates_count}).eq("id", batch_id).execute()
        
        return {
            "message": f"Successfully mapped {assigned_count} trainees to batch.",
            "assignedCount": assigned_count,
            "overflow": False
        }

def _map_trainees_to_batch_db(db, batch_id, trainee_ids, category, phase, background_tasks):
    pool_res = db.table("trainee_pool").select("*").in_("id", trainee_ids).execute()
    pool_trainees = pool_res.data or []
    
    assigned_count = 0
    candidates_info = []
    for t in pool_trainees:
        email = t["email"].strip().lower()
        fullName = t["full_name"].strip()
        college = t.get("college")
        phone = t.get("phone")
        reg_num = t.get("registration_number")
        
        existing_user = db.table("users").select("*").eq("email", email).execute()
        if existing_user.data:
            user_row = existing_user.data[0]
            user_uuid = user_row["id"]
            current_batches = user_row.get("assigned_batches", []) or []
            if batch_id not in current_batches:
                current_batches.append(batch_id)
                db.table("users").update({"assigned_batches": current_batches}).eq("id", user_uuid).execute()
            emp_id = reg_num if reg_num else get_next_employee_id(db)
        else:
            emp_id = reg_num if reg_num else get_next_employee_id(db)
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
            
            background_tasks.add_task(
                EmailService.send_trainee_credentials,
                candidate_email=email,
                candidate_name=fullName,
                employee_id=emp_id,
                temp_password=temp_password
            )
            
        existing_cand_any = db.table("candidates").select("*").eq("email", email).execute()
        if existing_cand_any.data:
            cand_res = db.table("candidates").update({"batch_id": batch_id}).eq("email", email).execute()
        else:
            candidate = Candidate(
                email=email,
                fullName=fullName,
                registrationNumber=emp_id,
                batchId=batch_id,
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
                
        next_status = "SPARK_1"
        if category == "SPARK":
            next_status = "SPARK_2" if phase == "PHASE_2" else "SPARK_1"
        elif category == "FOUNDATIONAL":
            next_status = "FOUNDATION"
        elif category == "STREAM":
            next_status = "STREAM"
            
        db.table("trainee_pool").update({
            "status": next_status,
            "current_batch_id": batch_id
        }).eq("id", t["id"]).execute()
        
        assigned_count += 1
        
    if candidates_info:
        background_tasks.add_task(
            ReportCardService.bg_create_report_cards,
            batch_id,
            candidates_info,
            None
        )
    return assigned_count

@router.put("/pool/{id}")
async def update_pool_trainee(
    id: str,
    payload: dict,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(has_role("ADMIN", "COORDINATOR"))
):
    db = get_db()
    db_update = {}
    for k, v in payload.items():
        if k == "fullName": db_update["full_name"] = v
        elif k == "foundationLanguage": db_update["foundation_language"] = v
        elif k == "streamTraining": db_update["stream_training"] = v
        elif k == "eliminatedPhase": db_update["eliminated_phase"] = v
        elif k == "currentBatchId": db_update["current_batch_id"] = v
        else:
            import re
            snake = re.sub(r'(?<!^)(?=[A-Z])', '_', k).lower()
            db_update[snake] = v
            
    try:
        # Fetch current record first to check if email/name changes
        current_pool_res = db.table("trainee_pool").select("*").eq("id", id).execute()
        if not current_pool_res.data:
            raise HTTPException(status_code=404, detail="Trainee not found in pool")
        current_pool = current_pool_res.data[0]
        old_email = current_pool["email"].strip().lower()
        
        # Update pool table first
        res = db.table("trainee_pool").update(db_update).eq("id", id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Trainee not found in pool")
            
        new_email = db_update.get("email")
        if new_email:
            new_email = new_email.strip().lower()
            if new_email != old_email:
                user_res = db.table("users").select("*").eq("email", old_email).execute()
                if user_res.data:
                    user_row = user_res.data[0]
                    user_id = user_row["id"]
                    
                    temp_password = generate_temp_password()
                    password_hash = hash_password(temp_password)
                    
                    # Update users table
                    db.table("users").update({
                        "email": new_email,
                        "password_hash": password_hash
                    }).eq("id", user_id).execute()
                    
                    # Update candidates table
                    db.table("candidates").update({"email": new_email}).eq("email", old_email).execute()
                    
                    # Trigger the email to new address with the same static registration number
                    emp_id = current_pool.get("registration_number") or get_next_employee_id(db)
                    background_tasks.add_task(
                        EmailService.send_trainee_credentials,
                        candidate_email=new_email,
                        candidate_name=db_update.get("full_name") or current_pool.get("full_name"),
                        employee_id=emp_id,
                        temp_password=temp_password
                    )
                else:
                    temp_password = generate_temp_password()
                    password_hash = hash_password(temp_password)
                    emp_id = current_pool.get("registration_number") or get_next_employee_id(db)
                    
                    new_user = {
                        "email": new_email,
                        "full_name": db_update.get("full_name") or current_pool.get("full_name"),
                        "password_hash": password_hash,
                        "role": "TRAINEE",
                        "assigned_batches": [],
                        "is_active": True,
                        "employee_id": emp_id,
                        "is_first_login": True
                    }
                    db.table("users").insert(new_user).execute()
                    
                    background_tasks.add_task(
                        EmailService.send_trainee_credentials,
                        candidate_email=new_email,
                        candidate_name=db_update.get("full_name") or current_pool.get("full_name"),
                        employee_id=emp_id,
                        temp_password=temp_password
                    )
                    
        # Update full name if changed
        new_name = db_update.get("full_name")
        if new_name and new_name.strip() != current_pool.get("full_name", "").strip():
            target_email = new_email if new_email else old_email
            db.table("users").update({"full_name": new_name.strip()}).eq("email", target_email).execute()
            db.table("candidates").update({"full_name": new_name.strip()}).eq("email", target_email).execute()
            
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/pool-count")
async def get_trainee_pool_count(
    onboarding_date: str,
    category: str,
    phase: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    try:
        role = current_user.get("role")
        user_id = current_user.get("sub") or current_user.get("email") or ""
        
        source_status = "UNASSIGNED"
        if category == "SPARK":
            if phase == "PHASE_2":
                source_status = "FOUNDATION"
            else:
                source_status = "UNASSIGNED"
        elif category == "FOUNDATIONAL":
            source_status = "SPARK_1"
        elif category == "STREAM":
            source_status = "SPARK_2"
            
        if role == "COORDINATOR":
            coord_emails = get_coordinator_trainee_emails(user_id)
            if not coord_emails:
                return {"count": 0}
            res = db.table("trainee_pool").select("email").eq("onboarding_date", onboarding_date).eq("status", source_status).execute()
            count = sum(1 for t in res.data or [] if t.get("email", "").strip().lower() in coord_emails)
            return {"count": count}
        else:
            res = db.table("trainee_pool").select("id", count="exact").eq("onboarding_date", onboarding_date).eq("status", source_status).execute()
            count = res.count if hasattr(res, 'count') else (len(res.data) if res.data else 0)
            return {"count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics")
async def get_pool_analytics(
    onboarding_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    try:
        role = current_user.get("role")
        user_id = current_user.get("sub") or current_user.get("email") or ""
        
        coordinator_dates = None
        if role == "COORDINATOR":
            coordinator_dates = get_coordinator_onboarding_dates(db, user_id)
            
        # 1. Fetch pool trainees
        pool_query = db.table("trainee_pool").select("*")
        if onboarding_date:
            if role == "COORDINATOR" and onboarding_date not in coordinator_dates:
                return {
                    "indicators": {
                        "totalCandidates": 0,
                        "discontinuedCandidates": 0,
                        "notClearedCandidates": 0,
                        "offeredOnboardedCandidates": 0,
                        "remainingInTraining": 0
                    },
                    "operationalMetrics": {
                        "attendancePerBatch": [],
                        "clearanceRatePerBatch": [],
                        "trainerPerformance": [],
                        "batchComparison": [],
                        "programComparison": []
                    }
                }
            pool_query = pool_query.eq("onboarding_date", onboarding_date)
        elif role == "COORDINATOR":
            if coordinator_dates:
                pool_query = pool_query.in_("onboarding_date", list(coordinator_dates))
            else:
                return {
                    "indicators": {
                        "totalCandidates": 0,
                        "discontinuedCandidates": 0,
                        "notClearedCandidates": 0,
                        "offeredOnboardedCandidates": 0,
                        "remainingInTraining": 0
                    },
                    "operationalMetrics": {
                        "attendancePerBatch": [],
                        "clearanceRatePerBatch": [],
                        "trainerPerformance": [],
                        "batchComparison": [],
                        "programComparison": []
                    }
                }
                
        pool_res = pool_query.execute()
        trainees = pool_res.data or []
        
        if role == "COORDINATOR":
            coord_emails = get_coordinator_trainee_emails(user_id)
            trainees = [t for t in trainees if t.get("email", "").strip().lower() in coord_emails]
            
        total_candidates = len(trainees)
        discontinued = sum(1 for t in trainees if t.get("status") == "ELIMINATED")
        in_training = sum(1 for t in trainees if t.get("status") in ["SPARK_1", "SPARK_2", "FOUNDATION", "STREAM"])
        
        # Calculate offered/onboarded count from stream report cards with final_status == 'Cleared'
        emails = [t["email"].strip().lower() for t in trainees if t.get("email")]
        offered_onboarded = 0
        if emails:
            stream_res = db.table("stream_report_cards").select("email", "final_status").in_("email", emails).execute()
            cleared_emails = {r["email"].strip().lower() for r in stream_res.data or [] if r.get("final_status") == "Cleared"}
            offered_onboarded = len(cleared_emails)
        
        # Calculate not cleared from report cards
        emails = [t["email"].strip().lower() for t in trainees if t.get("email")]
        not_cleared = 0
        if emails:
            s1_res = db.table("spark_1_report_cards").select("email", "final_status").in_("email", emails).execute()
            s2_res = db.table("spark_2_report_cards").select("email", "final_status").in_("email", emails).execute()
            stream_res = db.table("stream_report_cards").select("email", "final_status").in_("email", emails).execute()
            foundation_res = db.table("foundation_report_cards").select("email", "training_status").in_("email", emails).execute()
            
            failed_emails = set()
            for r in s1_res.data or []:
                status_val = r.get("final_status") or ""
                if "fail" in status_val.lower() or status_val == "Not Cleared":
                    failed_emails.add(r["email"].strip().lower())
            for r in s2_res.data or []:
                status_val = r.get("final_status") or ""
                if "fail" in status_val.lower() or status_val == "Not Cleared":
                    failed_emails.add(r["email"].strip().lower())
            for r in stream_res.data or []:
                status_val = r.get("final_status") or ""
                if "fail" in status_val.lower() or status_val == "Not Cleared":
                    failed_emails.add(r["email"].strip().lower())
            for r in foundation_res.data or []:
                status_val = r.get("training_status") or ""
                if "fail" in status_val.lower() or status_val == "Not Cleared":
                    failed_emails.add(r["email"].strip().lower())
            
            not_cleared = len(failed_emails)

        # 2. Fetch batches
        batch_query = db.table("batches").select("*")
        if onboarding_date:
            batch_query = batch_query.eq("onboarding_date", onboarding_date)
        elif role == "COORDINATOR":
            if coordinator_dates:
                batch_query = batch_query.in_("onboarding_date", list(coordinator_dates))
            else:
                batches = []
                
        if role != "COORDINATOR" or (role == "COORDINATOR" and coordinator_dates):
            batch_res = batch_query.execute()
            all_batches = batch_res.data or []
        else:
            all_batches = []
            
        # Filter batches by creator if coordinator
        batches = []
        import json
        for b in all_batches:
            desc_str = b.get("description")
            creator = ""
            if desc_str and desc_str.startswith("{"):
                try:
                    creator = json.loads(desc_str).get("created_by", "")
                except:
                    pass
            is_original = not creator and user_id in ["df772f20-b396-4a3b-8ddc-68fcd54b6060", "728f45b3-f6bd-4cfa-860f-a42c89682b33"]
            if role != "COORDINATOR" or creator == user_id or is_original:
                batches.append(b)
        
        # Gather metrics for each batch
        attendance_per_batch = []
        clearance_rate_per_batch = []
        batch_comparison = []
        trainer_map = {}
        program_map = {}
        
        for b in batches:
            b_id = b["id"]
            b_name = b["batch_name"]
            cat = b.get("category", "SPARK") or "SPARK"
            phase = b.get("phase")
            trainers = b.get("trainers") or []
            
            # Fetch attendance %
            att_res = db.table("attendances").select("status").eq("batch_id", b_id).execute()
            att_data = att_res.data or []
            total_att = len(att_data)
            present_count = sum(1 for a in att_data if a.get("status") in ["PRESENT", "LATE", "Present", "Late"])
            # Fallback to a mock/reasonable rate if no records exist yet
            attendance_pct = round((present_count / total_att) * 100, 1) if total_att > 0 else 0.0
            
            # Fetch average score from assessments
            assess_res = db.table("assessments").select("percentage").eq("batch_id", b_id).execute()
            assess_data = assess_res.data or []
            avg_score = round(sum(a.get("percentage", 0) for a in assess_data) / len(assess_data), 1) if assess_data else 0.0
            
            # Fetch clearance rate from report cards
            rc_table = None
            if cat == "SPARK":
                rc_table = "spark_2_report_cards" if phase == "PHASE_2" else "spark_1_report_cards"
            elif cat == "FOUNDATIONAL":
                rc_table = "foundation_report_cards"
            elif cat == "STREAM":
                rc_table = "stream_report_cards"
                
            cleared_count = 0
            total_rc = 0
            if rc_table:
                rc_res = db.table(rc_table).select("*").eq("batch_id", b_id).execute()
                rc_data = rc_res.data or []
                total_rc = len(rc_data)
                if rc_table == "foundation_report_cards":
                    cleared_count = sum(1 for r in rc_data if r.get("training_status") not in ["Failed", "Not Cleared"])
                else:
                    cleared_count = sum(1 for r in rc_data if r.get("final_status") == "Cleared")
                    
            clearance_rate = round((cleared_count / total_rc) * 100, 1) if total_rc > 0 else 0.0
            
            # Append batch metrics
            attendance_per_batch.append({"batchName": b_name, "attendance": attendance_pct})
            clearance_rate_per_batch.append({"batchName": b_name, "clearanceRate": clearance_rate})
            batch_comparison.append({
                "batchId": b_id,
                "batchName": b_name,
                "program": f"{cat} {phase}" if phase else cat,
                "avgAttendance": attendance_pct,
                "avgScore": avg_score,
                "clearanceRate": clearance_rate
            })
            
            # Group by trainer
            for t in trainers:
                t_clean = t.strip()
                if not t_clean: continue
                if t_clean not in trainer_map:
                    trainer_map[t_clean] = {"attendance_sum": 0.0, "score_sum": 0.0, "batch_count": 0}
                trainer_map[t_clean]["attendance_sum"] += attendance_pct
                trainer_map[t_clean]["score_sum"] += avg_score
                trainer_map[t_clean]["batch_count"] += 1
                
            # Group by program (category)
            prog_key = f"{cat} {phase}" if phase else cat
            if prog_key not in program_map:
                program_map[prog_key] = {"attendance_sum": 0.0, "score_sum": 0.0, "batch_count": 0}
            program_map[prog_key]["attendance_sum"] += attendance_pct
            program_map[prog_key]["score_sum"] += avg_score
            program_map[prog_key]["batch_count"] += 1
            
        # Format trainer performance
        trainer_performance = []
        for t, data in trainer_map.items():
            count = data["batch_count"]
            trainer_performance.append({
                "trainerName": t,
                "avgScore": round(data["score_sum"] / count, 1) if count > 0 else 0.0,
                "avgAttendance": round(data["attendance_sum"] / count, 1) if count > 0 else 0.0
            })
            
        # Format program comparison
        program_comparison = []
        for prog, data in program_map.items():
            count = data["batch_count"]
            program_comparison.append({
                "program": prog,
                "avgScore": round(data["score_sum"] / count, 1) if count > 0 else 0.0,
                "avgAttendance": round(data["attendance_sum"] / count, 1) if count > 0 else 0.0
            })
            
        return {
            "indicators": {
                "totalCandidates": total_candidates,
                "discontinuedCandidates": discontinued,
                "notClearedCandidates": not_cleared,
                "offeredOnboardedCandidates": offered_onboarded,
                "remainingInTraining": in_training
            },
            "operationalMetrics": {
                "attendancePerBatch": attendance_per_batch,
                "clearanceRatePerBatch": clearance_rate_per_batch,
                "trainerPerformance": trainer_performance,
                "batchComparison": batch_comparison,
                "programComparison": program_comparison
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
