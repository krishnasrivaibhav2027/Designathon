import io
import csv
import openpyxl
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form, BackgroundTasks
from app.core.database import get_db
from app.core.security import get_current_user, has_role, hash_password
from app.models.models import Candidate, row_to_api
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
                        "is_active": True
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
            
        return {"inserted": len(to_insert), "skipped": len(trainees) - len(to_insert)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database insert failed: {str(e)}")

@router.get("/dates")
async def get_onboarding_dates(current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
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
        query = db.table("trainee_pool").select("*")
        if onboarding_date:
            query = query.eq("onboarding_date", onboarding_date)
        if status:
            query = query.eq("status", status)
            
        res = query.execute()
        
        mapped = []
        for row in res.data or []:
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
    db = get_db()
    
    batch_res = db.table("batches").select("*").eq("id", payload.batchId).execute()
    if not batch_res.data:
        raise HTTPException(status_code=404, detail="Batch not found")
    batch_data = batch_res.data[0]
    
    batch_id = batch_data["id"]
    category = batch_data.get("category", "SPARK") or "SPARK"
    phase = batch_data.get("phase")
    size_limit = batch_data.get("size_limit") or 50
    current_candidates_count = batch_data.get("candidates_count") or 0
    
    available_slots = size_limit - current_candidates_count
    if available_slots <= 0:
        raise HTTPException(
            status_code=400,
            detail=f"This batch is already full. (Size limit: {size_limit}, Candidates enrolled: {current_candidates_count})"
        )
        
    trainees_to_assign = payload.traineeIds
    warning_flag = False
    
    if len(trainees_to_assign) > available_slots:
        warning_flag = True
        trainees_to_assign = trainees_to_assign[:available_slots]
        
    pool_res = db.table("trainee_pool").select("*").in_("id", trainees_to_assign).execute()
    pool_trainees = pool_res.data or []
    
    assigned_count = 0
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
                "is_active": True
            }
            db.table("users").insert(new_user).execute()
            
            background_tasks.add_task(
                EmailService.send_trainee_credentials,
                candidate_email=email,
                candidate_name=fullName,
                employee_id=emp_id,
                temp_password=temp_password
            )
            
        existing_cand = db.table("candidates").select("*").eq("email", email).eq("batch_id", batch_id).execute()
        if not existing_cand.data:
            candidate = Candidate(
                email=email,
                fullName=fullName,
                registrationNumber=emp_id,
                batchId=batch_id,
                phone=phone
            )
            cand_res = db.table("candidates").insert(candidate.to_dict()).execute()
            if cand_res.data:
                ReportCardService.create_report_cards_for_candidate(
                    db, batch_id, cand_res.data[0]["id"], fullName, email, college
                )
                
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
        
    new_candidates_count = current_candidates_count + assigned_count
    db.table("batches").update({"candidates_count": new_candidates_count}).eq("id", batch_id).execute()
    
    return {
        "message": f"Successfully mapped {assigned_count} trainees to batch.",
        "assignedCount": assigned_count,
        "warning": warning_flag,
        "warningMessage": "The selected pool size exceeds the maximum batch limit of 50. Please schedule another Spark batch with a different date for the remaining trainees." if warning_flag else None
    }

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
                        "is_active": True
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
            
        res = db.table("trainee_pool").select("id", count="exact").eq("onboarding_date", onboarding_date).eq("status", source_status).execute()
        count = res.count if hasattr(res, 'count') else (len(res.data) if res.data else 0)
        return {"count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
