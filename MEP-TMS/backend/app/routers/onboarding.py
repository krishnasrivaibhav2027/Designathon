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
            superset_idx = -1
            
            for idx, h in enumerate(headers):
                if "superset" in h:
                    superset_idx = idx
                elif h in ["full name", "fullname", "name"] or "name" in h:
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
                superset_id = row[superset_idx].strip() if superset_idx != -1 and len(row) > superset_idx else None
                
                if name and email:
                    trainees.append({
                        "email": email,
                        "full_name": name,
                        "college": college,
                        "phone": phone,
                        "onboarding_date": onboarding_date,
                        "status": "UNASSIGNED",
                        "foundation_language": skillset,
                        "registration_number": superset_id
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
            superset_idx = -1
            
            for idx, h in enumerate(headers, 1):
                if "superset" in h:
                    superset_idx = idx
                elif h in ["full name", "fullname", "name"] or "name" in h:
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
                superset_id = ws.cell(row=r_idx, column=superset_idx).value if superset_idx != -1 else None
                
                if name and email:
                    trainees.append({
                        "email": str(email).strip().lower(),
                        "full_name": str(name).strip(),
                        "college": str(college).strip() if college else None,
                        "phone": str(phone).strip() if phone else None,
                        "onboarding_date": onboarding_date,
                        "status": "UNASSIGNED",
                        "foundation_language": str(skillset).strip() if skillset else None,
                        "registration_number": str(superset_id).strip() if superset_id else None
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
                if not t.get("registration_number"):
                    current_max += 1
                    emp_id = f"MAV-{current_max:03d}"
                    t["registration_number"] = emp_id
                else:
                    emp_id = t["registration_number"]
                
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
            
        try:
            from app.core.logging_helper import log_file_upload_and_notify
            log_file_upload_and_notify(
                user=current_user,
                filename=file.filename,
                file_type="ONBOARDING_TRAINEES",
                row_count=len(to_insert),
                status="SUCCESS"
            )
        except Exception as log_err:
            print(f"[Warn] Failed to log success: {log_err}")
            
        return {"inserted": len(to_insert), "skipped": len(trainees) - len(to_insert)}
    except Exception as e:
        try:
            from app.core.logging_helper import log_file_upload_and_notify
            log_file_upload_and_notify(
                user=current_user,
                filename=file.filename,
                file_type="ONBOARDING_TRAINEES",
                row_count=0,
                status="FAILED",
                error_msg=str(e)
            )
        except Exception as log_err:
            print(f"[Warn] Failed to log failure: {log_err}")
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
                "registrationNumber": row.get("registration_number"),
                "createdAt": row["created_at"],
                "updatedAt": row["updated_at"],
                "bitsAccumulated": row.get("bits_accumulated", 0),
                "bytesTotal": row.get("bytes_total", 0),
                "isPermanentEmployee": row.get("is_permanent_employee", False)
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

    # Fetch trainee records for validation
    pool_res = db.table("trainee_pool").select("*").in_("id", payload.traineeIds).execute()
    trainees = pool_res.data or []
    if not trainees:
        raise HTTPException(status_code=400, detail="No active trainees found for the selected IDs.")

    # Validation: Enforce sequential pipeline workflow rules
    for t in trainees:
        t_status = t.get("status", "UNASSIGNED")
        t_email = t.get("email")
        t_name = t.get("full_name", t_email)
        
        if category == "SPARK" and (phase == "PHASE_1" or not phase):
            # Target is Spark Phase 1: Trainee must be UNASSIGNED
            if t_status != "UNASSIGNED":
                raise HTTPException(
                    status_code=400,
                    detail=f"Trainee '{t_name}' ({t_email}) is currently in status '{t_status}'. Only UNASSIGNED trainees can be assigned to Spark Phase 1."
                )
                
        elif category == "FOUNDATIONAL":
            # Target is Foundational: Trainee must have completed Spark Phase 1
            if t_status != "SPARK_1":
                raise HTTPException(
                    status_code=400,
                    detail=f"Trainee '{t_name}' ({t_email}) is currently in status '{t_status}'. Only trainees in 'SPARK_1' status can be assigned to Foundational batches."
                )
            # Check spark_1_report_cards clearance
            rc_res = db.table("spark_1_report_cards").select("final_status").eq("email", t_email).execute()
            if not rc_res.data or rc_res.data[0].get("final_status") != "Cleared":
                rc_status = rc_res.data[0].get("final_status") if rc_res.data else "No Record"
                raise HTTPException(
                    status_code=400,
                    detail=f"Trainee '{t_name}' ({t_email}) has not cleared Spark Phase 1 (status: {rc_status}) and cannot be assigned to a Foundational batch."
                )
                
        elif category == "SPARK" and phase == "PHASE_2":
            # Target is Spark Phase 2: Trainee must have completed Foundational
            if t_status != "FOUNDATION":
                raise HTTPException(
                    status_code=400,
                    detail=f"Trainee '{t_name}' ({t_email}) is currently in status '{t_status}'. Only trainees in 'FOUNDATION' status can be assigned to Spark Phase 2."
                )
            # Check foundation_report_cards clearance
            rc_res = db.table("foundation_report_cards").select("training_status").eq("email", t_email).execute()
            if not rc_res.data or rc_res.data[0].get("training_status") != "Cleared":
                rc_status = rc_res.data[0].get("training_status") if rc_res.data else "No Record"
                raise HTTPException(
                    status_code=400,
                    detail=f"Trainee '{t_name}' ({t_email}) has not cleared Foundational training (status: {rc_status}) and cannot be assigned to Spark Phase 2."
                )
                
        elif category == "STREAM":
            # Target is Stream: Trainee must have completed Spark Phase 2
            if t_status != "SPARK_2":
                raise HTTPException(
                    status_code=400,
                    detail=f"Trainee '{t_name}' ({t_email}) is currently in status '{t_status}'. Only trainees in 'SPARK_2' status can be assigned to Stream batches."
                )
            # Check spark_2_report_cards clearance
            rc_res = db.table("spark_2_report_cards").select("final_status").eq("email", t_email).execute()
            if not rc_res.data or rc_res.data[0].get("final_status") != "Cleared":
                rc_status = rc_res.data[0].get("final_status") if rc_res.data else "No Record"
                raise HTTPException(
                    status_code=400,
                    detail=f"Trainee '{t_name}' ({t_email}) has not cleared Spark Phase 2 (status: {rc_status}) and cannot be assigned to a Stream batch."
                )

    if category in ["FOUNDATIONAL", "STREAM"]:
        import re
        import json
        
        # Fetch all concurrent planned or running batches for the same onboarding date and category
        ob_date = batch_data.get("onboarding_date")
        concurrent_res = db.table("batches").select("*").eq("category", category).eq("onboarding_date", ob_date).in_("status", ["PLANNED", "RUNNING"]).execute()
        concurrent_batches = concurrent_res.data or []
        
        # Ensure the selected batch is in the concurrent list
        if not any(b["id"] == batch_data["id"] for b in concurrent_batches):
            concurrent_batches.append(batch_data)
            
        def normalize_skill(skill_str: str) -> str:
            s = skill_str.strip().lower()
            s = s.replace(".", "").replace("-", " ").strip()
            if s in ["c sharp", "csharp", "c #", "c#"]:
                return "c#"
            if s in ["c plus plus", "cplusplus", "c ++", "c++"]:
                return "c++"
            if s in ["js", "javascript", "java script"]:
                return "javascript"
            if s in ["ts", "typescript", "type script"]:
                return "typescript"
            if s in ["net", "dotnet", "net core", "dotnet core"]:
                return "dotnet"
            return s

        def get_batch_skills(batch_row):
            b_skills = set()
            name_lower = (batch_row.get("batch_name") or "").lower()
            keywords = ["java", "python", "c#", "csharp", "c-sharp", "c sharp", "c++", "javascript", "typescript", "ruby", "go", "rust"]
            for kw in keywords:
                if kw in name_lower:
                    b_skills.add(normalize_skill(kw))
            desc_str = batch_row.get("description")
            if desc_str:
                try:
                    desc_json = json.loads(desc_str)
                    if isinstance(desc_json, dict):
                        topics = desc_json.get("topics", [])
                        for t in topics:
                            t_str = ""
                            if isinstance(t, str):
                                t_str = t.lower()
                            elif isinstance(t, dict):
                                t_str = (t.get("topic") or "").lower()
                                subtopics = t.get("subtopics") or []
                                t_str += " " + " ".join([str(s).lower() for s in subtopics])
                            for kw in keywords:
                                if kw in t_str:
                                    b_skills.add(normalize_skill(kw))
                except Exception:
                    pass
            return b_skills

        batches_info = {}
        for b in concurrent_batches:
            b_id = b["id"]
            b_name = b["batch_name"]
            b_desc_str = b.get("description")
            b_size_limit = MIN_BATCH_SIZE_LIMIT
            b_desc_json = {}
            if b_desc_str:
                try:
                    b_desc_json = json.loads(b_desc_str)
                    if isinstance(b_desc_json, dict):
                        b_size_limit = b_desc_json.get("sizeLimit", MIN_BATCH_SIZE_LIMIT)
                except Exception:
                    pass
            if b_size_limit is None or b_size_limit <= 0:
                b_size_limit = MIN_BATCH_SIZE_LIMIT
                
            b_curr_count = b.get("candidates_count") or 0
            b_skills = get_batch_skills(b)
            
            batches_info[b_id] = {
                "id": b_id,
                "name": b_name,
                "size_limit": b_size_limit,
                "current_count": b_curr_count,
                "remaining_capacity": max(0, b_size_limit - b_curr_count),
                "needed_for_min": max(0, MIN_BATCH_SIZE_LIMIT - b_curr_count),
                "skills": b_skills,
                "assigned": []
            }
            
        # Check overall capacity
        total_available_slots = sum(b["remaining_capacity"] for b in batches_info.values())
        if len(trainees) > total_available_slots:
            batch_slots_desc = []
            for b_info in batches_info.values():
                batch_slots_desc.append(f"'{b_info['name']}': {b_info['remaining_capacity']} slots left")
            raise HTTPException(
                status_code=400,
                detail=f"Total selected trainees ({len(trainees)}) exceeds the total available capacity ({total_available_slots}) across concurrent batches. ({', '.join(batch_slots_desc)})"
            )
            
        # Pre-process trainee skillsets
        trainees_info = []
        for t in trainees:
            t_id = t["id"]
            fl = t.get("foundation_language") or ""
            parts = re.split(r'[,;/|]', fl) if fl else []
            t_skills = {normalize_skill(p) for p in parts if p.strip()}
            
            eligible_bids = []
            for b_id, b_info in batches_info.items():
                if not b_info["skills"] or not t_skills or len(t_skills.intersection(b_info["skills"])) > 0:
                    eligible_bids.append(b_id)
            if not eligible_bids:
                eligible_bids = list(batches_info.keys())
                
            trainees_info.append({
                "id": t_id,
                "skills": t_skills,
                "eligible_bids": eligible_bids,
                "assigned_bid": None
            })
            
        # Phase 1: Assign Single-Batch Trainees
        for t in trainees_info:
            if len(t["eligible_bids"]) == 1:
                b_id = t["eligible_bids"][0]
                b_info = batches_info[b_id]
                if b_info["current_count"] < b_info["size_limit"]:
                    b_info["assigned"].append(t["id"])
                    b_info["current_count"] += 1
                    b_info["remaining_capacity"] -= 1
                    b_info["needed_for_min"] = max(0, MIN_BATCH_SIZE_LIMIT - b_info["current_count"])
                    t["assigned_bid"] = b_id

        # Phase 2: Help Under-Enrolled Batches reach the 30-trainee minimum
        while True:
            under_batches = [b for b in batches_info.values() if b["needed_for_min"] > 0 and b["remaining_capacity"] > 0]
            if not under_batches:
                break
            under_batches.sort(key=lambda b: (b["needed_for_min"], b["remaining_capacity"]), reverse=True)
            
            assigned_any = False
            for b_info in under_batches:
                eligible_trainee = None
                for t in trainees_info:
                    if t["assigned_bid"] is None and b_info["id"] in t["eligible_bids"]:
                        eligible_trainee = t
                        break
                if eligible_trainee:
                    b_id = b_info["id"]
                    b_info["assigned"].append(eligible_trainee["id"])
                    b_info["current_count"] += 1
                    b_info["remaining_capacity"] -= 1
                    b_info["needed_for_min"] = max(0, MIN_BATCH_SIZE_LIMIT - b_info["current_count"])
                    eligible_trainee["assigned_bid"] = b_id
                    assigned_any = True
                    break
            if not assigned_any:
                break

        # Phase 3: Load-Balance Remaining Trainees
        for t in trainees_info:
            if t["assigned_bid"] is not None:
                continue
            eligible_open_batches = [batches_info[b_id] for b_id in t["eligible_bids"] if batches_info[b_id]["remaining_capacity"] > 0]
            if not eligible_open_batches:
                eligible_open_batches = [b for b in batches_info.values() if b["remaining_capacity"] > 0]
            if eligible_open_batches:
                eligible_open_batches.sort(key=lambda b: b["current_count"])
                best_batch = eligible_open_batches[0]
                b_id = best_batch["id"]
                best_batch["assigned"].append(t["id"])
                best_batch["current_count"] += 1
                best_batch["remaining_capacity"] -= 1
                best_batch["needed_for_min"] = max(0, MIN_BATCH_SIZE_LIMIT - best_batch["current_count"])
                t["assigned_bid"] = b_id

        # Write updates to Database
        total_assigned = 0
        assigned_messages = []
        for b_id, b_info in batches_info.items():
            assigned_tids = b_info["assigned"]
            if assigned_tids:
                mapped_count = _map_trainees_to_batch_db(db, b_id, assigned_tids, category, phase, background_tasks)
                orig_batch = next(b for b in concurrent_batches if b["id"] == b_id)
                orig_count = orig_batch.get("candidates_count") or 0
                db.table("batches").update({"candidates_count": orig_count + mapped_count}).eq("id", b_id).execute()
                total_assigned += mapped_count
                assigned_messages.append(f"{mapped_count} trainees to '{b_info['name']}'")
                
        return {
            "message": f"Successfully auto-distributed {total_assigned} trainees: {', '.join(assigned_messages)}.",
            "assignedCount": total_assigned,
            "overflow": False
        }

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
            split_desc_json["sizeLimit"] = size_limit
            split_desc_json["session_dates"] = split_session_dates
            if "topics" not in split_desc_json:
                split_desc_json["topics"] = desc_json.get("topics", [])
            
            new_batch = {
                "id": new_batch_uuid,
                "batch_id": new_batch_id_str,
                "batch_name": split_name,
                "start_date": split_start.isoformat() + "Z",
                "end_date": split_end.isoformat() + "Z",
                "status": "PLANNED",
                "trainers": batch_data.get("trainers", []),
                "description": json.dumps(split_desc_json),
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
                role_label = current_user.get("role", "User").title()
                user_name = current_user.get("fullName", role_label)
                db.table("notifications").insert({
                    "type": "BATCH_CREATED",
                    "message": f"Successfully created Split Cohort '{split_name}' with {len(cohorts_ids[i-1])} trainees, by {role_label} {user_name}.",
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

        # Gamification: Phase clearance bonus (16 bits = 2 Bytes)
        _PHASE_CLEARANCE_REASONS = {
            "FOUNDATION": "Phase clearance: Cleared Spark Phase 1",
            "SPARK_2": "Phase clearance: Cleared Foundational Training",
            "STREAM": "Phase clearance: Cleared Spark Phase 2",
        }
        if next_status in _PHASE_CLEARANCE_REASONS:
            try:
                cand_id = cand_res.data[0]["id"] if cand_res.data else None
                if cand_id:
                    from app.services.gamification_service import GamificationService
                    GamificationService.award_bits(
                        db,
                        candidate_id=cand_id,
                        amount=16,
                        reason=_PHASE_CLEARANCE_REASONS[next_status]
                    )
            except Exception as g_err:
                print(f"[Warn] Phase clearance gamification failed for {email}: {g_err}")

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
        elif k == "registrationNumber": db_update["registration_number"] = v
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
                    
        target_email = new_email if new_email else old_email

        # Update full name if changed
        new_name = db_update.get("full_name")
        if new_name and new_name.strip() != current_pool.get("full_name", "").strip():
            db.table("users").update({"full_name": new_name.strip()}).eq("email", target_email).execute()
            db.table("candidates").update({"full_name": new_name.strip()}).eq("email", target_email).execute()
            
        # Update phone if changed
        new_phone = db_update.get("phone")
        old_phone = current_pool.get("phone") or ""
        if new_phone is not None and new_phone.strip() != old_phone.strip():
            db.table("users").update({"phone": new_phone.strip()}).eq("email", target_email).execute()
            db.table("candidates").update({"phone": new_phone.strip()}).eq("email", target_email).execute()

        # Update is_active based on status and clean candidate record if UNASSIGNED
        new_status = db_update.get("status")
        if new_status:
            # Deactivate if ELIMINATED, reactivate otherwise
            is_active_val = (new_status != "ELIMINATED")
            db.table("users").update({"is_active": is_active_val}).eq("email", target_email).execute()
            
            # If changed to UNASSIGNED, they are not enrolled in any batch, so delete candidate record
            if new_status == "UNASSIGNED":
                db.table("candidates").delete().eq("email", target_email).execute()
                db.table("users").update({"assigned_batches": []}).eq("email", target_email).execute()
                # Clear batch ID in pool
                db.table("trainee_pool").update({"current_batch_id": None}).eq("id", id).execute()
                
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
                        "skillDistribution": [],
                        "batchComparison": [],
                        "statusBreakdown": [],
                        "milestones": []
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
                        "skillDistribution": [],
                        "batchComparison": [],
                        "statusBreakdown": [],
                        "milestones": []
                    }
                }
                
        pool_res = pool_query.execute()
        trainees = pool_res.data or []
        
        if role == "COORDINATOR":
            coord_emails = get_coordinator_trainee_emails(user_id)
            trainees = [t for t in trainees if t.get("email", "").strip().lower() in coord_emails]
            
        total_candidates = len(trainees)
        discontinued = 0 # will be calculated accurately below
        in_training = sum(1 for t in trainees if t.get("status") in ["SPARK_1", "SPARK_2", "FOUNDATION", "STREAM"])
        
        def normalize_skill(skill_str: str) -> str:
            s = skill_str.strip().lower()
            s = s.replace(".", "").replace("-", " ").strip()
            if s in ["c sharp", "csharp", "c #", "c#"]:
                return "c#"
            if s in ["c plus plus", "cplusplus", "c ++", "c++"]:
                return "c++"
            if s in ["js", "javascript", "java script"]:
                return "javascript"
            if s in ["ts", "typescript", "type script"]:
                return "typescript"
            if s in ["net", "dotnet", "net core", "dotnet core"]:
                return "dotnet"
            return s

        # Calculate trainee skill distribution
        skill_counts = {}
        for t in trainees:
            lang_str = t.get("foundation_language")
            if lang_str:
                parts = [p.strip() for p in lang_str.split(",") if p.strip()]
                for p in parts:
                    norm = normalize_skill(p)
                    # Format nicely for display
                    display_name = norm.title()
                    if norm == "c#":
                        display_name = "C#"
                    elif norm == "c++":
                        display_name = "C++"
                    elif norm == "dotnet":
                        display_name = ".NET"
                    elif norm == "javascript":
                        display_name = "JavaScript"
                    elif norm == "typescript":
                        display_name = "TypeScript"
                    
                    skill_counts[display_name] = skill_counts.get(display_name, 0) + 1
            else:
                skill_counts["Unspecified"] = skill_counts.get("Unspecified", 0) + 1
                
        sorted_skills = sorted(skill_counts.items(), key=lambda x: x[1], reverse=True)
        skill_distribution = [{"skill": k, "count": v} for k, v in sorted_skills]
        
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
        failed_emails = set()
        if emails:
            s1_res = db.table("spark_1_report_cards").select("email", "final_status").in_("email", emails).execute()
            s2_res = db.table("spark_2_report_cards").select("email", "final_status").in_("email", emails).execute()
            stream_res = db.table("stream_report_cards").select("email", "final_status").in_("email", emails).execute()
            foundation_res = db.table("foundation_report_cards").select("email", "training_status").in_("email", emails).execute()
            
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
            
            # A candidate is only "Not Cleared" if their training is over (status is ELIMINATED)
            # and they have failed/not cleared assessments.
            eliminated_emails = {t["email"].strip().lower() for t in trainees if t.get("status") == "ELIMINATED"}
            not_cleared = len(failed_emails.intersection(eliminated_emails))
            discontinued = len(eliminated_emails) - not_cleared

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
                
            # program averages logic removed as redundant
            pass
            
        # Format trainer performance
        trainer_performance = []
        for t, data in trainer_map.items():
            count = data["batch_count"]
            trainer_performance.append({
                "trainerName": t,
                "avgScore": round(data["score_sum"] / count, 1) if count > 0 else 0.0,
                "avgAttendance": round(data["attendance_sum"] / count, 1) if count > 0 else 0.0
            })
            
        # Determine mutually exclusive training status categories for Pie/Donut chart
        failed_emails_pie = set()
        if emails:
            # Spark 1 Failed
            try:
                s1_failed = db.table("spark_1_report_cards").select("email").in_("email", emails).eq("final_status", "Failed").execute()
                for r in (s1_failed.data or []):
                    failed_emails_pie.add(r["email"].strip().lower())
            except Exception:
                pass
                
            # Spark 2 Failed
            try:
                s2_failed = db.table("spark_2_report_cards").select("email").in_("email", emails).eq("final_status", "Failed").execute()
                for r in (s2_failed.data or []):
                    failed_emails_pie.add(r["email"].strip().lower())
            except Exception:
                pass
                
            # Foundation Failed
            try:
                f_failed = db.table("foundation_report_cards").select("email").in_("email", emails).eq("training_status", "Failed").execute()
                for r in (f_failed.data or []):
                    failed_emails_pie.add(r["email"].strip().lower())
            except Exception:
                pass
                
            # Stream Failed
            try:
                st_failed = db.table("stream_report_cards").select("email").in_("email", emails).eq("final_status", "Failed").execute()
                for r in (st_failed.data or []):
                    failed_emails_pie.add(r["email"].strip().lower())
            except Exception:
                pass

        # Calculate counts
        cleared_count = 0
        discontinued_count = 0
        failed_count = 0
        in_progress_count = 0
        
        for t in trainees:
            email_lower = t.get("email", "").strip().lower()
            status_val = t.get("status")
            
            if email_lower in failed_emails_pie:
                failed_count += 1
            elif status_val == "ELIMINATED":
                discontinued_count += 1
            elif status_val == "COMPLETED":
                cleared_count += 1
            else:
                in_progress_count += 1
                
        status_breakdown = [
            {"name": "Cleared", "value": cleared_count},
            {"name": "In Progress", "value": in_progress_count},
            {"name": "Failed", "value": failed_count},
            {"name": "Discontinued", "value": discontinued_count}
        ]

        # Determine cohort milestones
        milestones = [
            {"id": "import", "title": "Trainees Imported", "status": "COMPLETED", "description": "Candidate cohort imported into pool"},
            {"id": "spark_1", "title": "Spark Phase 1", "status": "UPCOMING", "description": "Foundational programming & soft skills"},
            {"id": "foundation", "title": "Foundational Batches", "status": "UPCOMING", "description": "Language-specific stream distribution"},
            {"id": "spark_2", "title": "Spark Phase 2", "status": "UPCOMING", "description": "Advanced core training & evaluations"},
            {"id": "stream", "title": "Stream Specialization", "status": "UPCOMING", "description": "Project & practice-oriented streams"},
            {"id": "placement", "title": "Deployment & Offers", "status": "UPCOMING", "description": "Final clearance & job allocations"}
        ]
        
        # Dynamically assess based on trainee statuses
        # Statuses: UNASSIGNED, SPARK_1, FOUNDATION, SPARK_2, STREAM, COMPLETED, ELIMINATED
        has_spark_1 = any(t.get("status") == "SPARK_1" for t in trainees)
        has_foundation = any(t.get("status") == "FOUNDATION" for t in trainees)
        has_spark_2 = any(t.get("status") == "SPARK_2" for t in trainees)
        has_stream = any(t.get("status") == "STREAM" for t in trainees)
        has_completed = any(t.get("status") == "COMPLETED" for t in trainees)
        
        # Calculate states
        # Spark 1:
        if has_spark_1:
            milestones[1]["status"] = "ACTIVE"
        elif any(t.get("status") in ["FOUNDATION", "SPARK_2", "STREAM", "COMPLETED"] for t in trainees):
            milestones[1]["status"] = "COMPLETED"
            
        # Foundation:
        if has_foundation:
            milestones[2]["status"] = "ACTIVE"
        elif any(t.get("status") in ["SPARK_2", "STREAM", "COMPLETED"] for t in trainees):
            milestones[2]["status"] = "COMPLETED"
            
        # Spark 2:
        if has_spark_2:
            milestones[3]["status"] = "ACTIVE"
        elif any(t.get("status") in ["STREAM", "COMPLETED"] for t in trainees):
            milestones[3]["status"] = "COMPLETED"
            
        # Stream:
        if has_stream:
            milestones[4]["status"] = "ACTIVE"
        elif has_completed:
            milestones[4]["status"] = "COMPLETED"
            
        # Placement:
        if has_completed:
            if any(t.get("status") in ["SPARK_1", "FOUNDATION", "SPARK_2", "STREAM"] for t in trainees):
                milestones[5]["status"] = "ACTIVE"
            else:
                milestones[5]["status"] = "COMPLETED"
            
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
                "skillDistribution": skill_distribution,
                "batchComparison": batch_comparison,
                "statusBreakdown": status_breakdown,
                "milestones": milestones
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/convert-permanent/{trainee_id}")
async def convert_to_permanent_employee(
    trainee_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(has_role("ADMIN", "COORDINATOR"))
):
    """
    Onboard a trainee permanently as a Full-Time Employee (FTE).
    Updates trainee_pool, candidates, and users tables, then sends a greeting
    email containing their offer letter.
    """
    db = get_db()
    try:
        # 1. Fetch from trainee_pool
        pool_res = db.table("trainee_pool").select("*").eq("id", trainee_id).execute()
        if not pool_res.data:
            raise HTTPException(status_code=404, detail="Trainee not found in onboarding pool.")
        
        trainee = pool_res.data[0]
        email = trainee.get("email")
        full_name = trainee.get("full_name")
        emp_id = trainee.get("registration_number")
        
        if not email:
            raise HTTPException(status_code=400, detail="Trainee email is missing.")
            
        email_clean = email.strip().lower()

        # 2. Update trainee_pool status
        db.table("trainee_pool").update({
            "is_permanent_employee": True,
            "status": "COMPLETED"  # Set to completed to signify pipeline finality
        }).eq("id", trainee_id).execute()

        # 3. Update candidates table
        db.table("candidates").update({
            "is_permanent_employee": True
        }).eq("email", email_clean).execute()

        # 4. Update users table
        db.table("users").update({
            "is_permanent_employee": True
        }).eq("email", email_clean).execute()

        # Gamification: Stream clearance / Permanent FTE bonus (16 bits = 2 Bytes)
        try:
            cand_g = db.table("candidates").select("id").eq("email", email_clean).execute()
            if cand_g.data:
                from app.services.gamification_service import GamificationService
                GamificationService.award_bits(
                    db,
                    candidate_id=cand_g.data[0]["id"],
                    amount=16,
                    reason="Phase clearance: Cleared Stream Training (Permanent FTE)"
                )
        except Exception as g_err:
            print(f"[Warn] FTE conversion gamification failed for {email_clean}: {g_err}")

        # 5. Send Congratulations Welcome & Offer Letter Email
        background_tasks.add_task(
            EmailService.send_permanent_onboarding_letter,
            candidate_email=email_clean,
            candidate_name=full_name,
            employee_id=emp_id or "N/A"
        )
        
        return {
            "status": "success",
            "message": f"Successfully onboarded {full_name} as a permanent employee. Email queued.",
            "data": {
                "traineeId": trainee_id,
                "fullName": full_name,
                "email": email_clean,
                "employeeId": emp_id
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Onboarding failed: {str(e)}")

