from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from typing import List, Optional
from datetime import datetime, date as date_type, time as time_type
from app.schemas.schemas import (
    AttendanceCreate, AttendanceUpdate, AttendanceResponse,
    AttendanceBatchResponse
)
from app.core.database import get_db
from app.core.security import get_current_user, has_role, check_batch_access, check_candidate_access, check_attendance_access
from app.core.config import settings
from app.models.models import Attendance, AttendanceStatus, row_to_api
import csv
import io
import openpyxl

router = APIRouter(prefix="/api/attendance", tags=["attendance"])


def _is_past_cutoff() -> bool:
    """Return True if the current server time is past the configured attendance cutoff."""
    try:
        cutoff_str = settings.ATTENDANCE_CUTOFF_TIME  # e.g. "10:00"
        cutoff_hour, cutoff_minute = map(int, cutoff_str.split(":"))
        cutoff = time_type(cutoff_hour, cutoff_minute)
        return datetime.now().time() > cutoff
    except Exception:
        # If config is malformed, default to 10:00 AM
        return datetime.now().time() > time_type(10, 0)


def _write_audit_log(db, attendance_id: str, old_status: str, new_status: str,
                     changed_by: str, changed_by_role: str) -> None:
    """Insert a row into attendance_audit_logs (best-effort, never raises)."""
    try:
        db.table("attendance_audit_logs").insert({
            "attendance_id": attendance_id,
            "old_status": old_status,
            "new_status": new_status,
            "changed_by": changed_by,
            "changed_by_role": changed_by_role,
            "changed_at": datetime.utcnow().isoformat(),
        }).execute()
    except Exception as audit_err:
        print(f"[Warn] Failed to write attendance audit log: {audit_err}")

@router.post("/mark", response_model=AttendanceResponse)
async def mark_attendance(attendance_data: AttendanceCreate, current_user: dict = Depends(has_role("TRAINER", "COORDINATOR", "TRAINEE"))):
    """Mark attendance for a candidate"""
    db = get_db()
    check_batch_access(db, current_user, attendance_data.batchId)

    # ── Business Rule: cutoff time enforcement (Trainees only) ──────────────
    # Coordinators and Trainers are allowed to mark/correct attendance at any time.
    if current_user.get("role") == "TRAINEE" and _is_past_cutoff():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Attendance submission window has closed. Attendance must be submitted before {settings.ATTENDANCE_CUTOFF_TIME}."
        )

    # ── Validation: Trainee can only mark their own attendance ───────────────
    if current_user.get("role") == "TRAINEE":
        cand_res = db.table("candidates").select("id").eq("email", current_user.get("email").strip().lower()).execute()
        cand_ids = {c.get("id") for c in cand_res.data} if cand_res.data else set()
        if not cand_res.data or (attendance_data.candidateId not in cand_ids and "cand-mock-id" != attendance_data.candidateId):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Trainees can only mark their own attendance")

    try:
        # ── Validation: Candidate must exist ────────────────────────────────
        cand_check = db.table("candidates").select("id").eq("id", attendance_data.candidateId).execute()
        if not cand_check.data:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Candidate ID '{attendance_data.candidateId}' does not exist."
            )

        # ── Validation: Batch must exist and candidate must belong to it ────
        batch_check = db.table("batches").select("*").eq("id", attendance_data.batchId).execute()
        if not batch_check.data:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Batch ID '{attendance_data.batchId}' does not exist."
            )
        from app.routers.batch import sync_batch_status
        batch = sync_batch_status(db, batch_check.data[0])
        batch_status_val = batch.get("status")
        if batch_status_val == "CLOSED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot mark attendance for a CLOSED batch."
            )
        if batch_status_val == "COMPLETED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Training has ended and the assessment window is now open. Attendance marking is disabled."
            )
        batch_name = batch.get("batch_name", "Unknown")

        # Fetch candidate email to check user assigned_batches
        cand_email_res = db.table("candidates").select("email").eq("id", attendance_data.candidateId).execute()
        is_mapped = False
        if cand_email_res.data:
            cand_email = cand_email_res.data[0]["email"]
            user_check = db.table("users").select("assigned_batches").eq("email", cand_email).execute()
            if user_check.data:
                assigned = user_check.data[0].get("assigned_batches", []) or []
                if attendance_data.batchId in assigned:
                    is_mapped = True
        
        # Fallback to direct candidates table query
        if not is_mapped:
            mapping_check = db.table("candidates").select("id").eq("id", attendance_data.candidateId).eq("batch_id", attendance_data.batchId).execute()
            if mapping_check.data:
                is_mapped = True
                
        if not is_mapped:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Candidate '{attendance_data.candidateId}' is not mapped to batch '{batch_name}'."
            )

        # ── Duplicate check / upsert ─────────────────────────────────────────
        target_date = attendance_data.date.date()
        target_start = datetime.combine(target_date, datetime.min.time()).isoformat()
        target_end = datetime.combine(target_date, datetime.max.time()).isoformat()

        existing = db.table("attendances").select("*") \
            .eq("batch_id", attendance_data.batchId) \
            .eq("candidate_id", attendance_data.candidateId) \
            .gte("date", target_start) \
            .lt("date", target_end) \
            .execute()

        if existing.data:
            # Update existing attendance and write audit log
            record = existing.data[0]
            old_status = record.get("status", "")
            new_version = record.get("version", 1) + 1

            result = db.table("attendances").update({
                "status": attendance_data.status.value,
                "version": new_version
            }).eq("id", record["id"]).execute()

            if not result.data:
                raise HTTPException(status_code=500, detail="Failed to update attendance")

            _write_audit_log(
                db,
                attendance_id=record["id"],
                old_status=old_status,
                new_status=attendance_data.status.value,
                changed_by=current_user.get("email", ""),
                changed_by_role=current_user.get("role", ""),
            )

            return AttendanceResponse(**row_to_api(result.data[0]))

        # Create new attendance record
        attendance = Attendance(
            batchId=attendance_data.batchId,
            candidateId=attendance_data.candidateId,
            date=attendance_data.date,
            status=attendance_data.status
        )

        result = db.table("attendances").insert(attendance.to_dict()).execute()

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to mark attendance")

        ret_val = AttendanceResponse(**row_to_api(result.data[0]))

        # Log ATTENDANCE_UPLOAD notification for any role
        try:
            role_label = current_user.get("role", "User").title()
            user_name = current_user.get("fullName", role_label)
            if current_user.get("role") == "TRAINEE":
                msg = f"Trainee {user_name} marked/updated attendance for Batch '{batch_name}'."
            else:
                msg = f"{role_label} {user_name} marked/updated attendance for Batch '{batch_name}'."
            
            db.table("notifications").insert({
                "type": "ATTENDANCE_UPLOAD",
                "message": msg,
                "is_read": False,
                "created_at": datetime.utcnow().isoformat()
            }).execute()
        except Exception as notif_err:
            print(f"[Warn] Failed to create ATTENDANCE_UPLOAD notification: {notif_err}")

        return ret_val
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/bulk-upload")
async def bulk_upload_attendance(
    batch_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(has_role("COORDINATOR", "TRAINER", "ADMIN"))
):
    """Bulk upload attendance from CSV or Excel (.xlsx) sheet"""
    db = get_db()
    check_batch_access(db, current_user, batch_id)
    
    # Check if batch is CLOSED
    batch_name = "Unknown"
    batch_res = db.table("batches").select("*").eq("id", batch_id).execute()
    if batch_res.data:
        batch_name = batch_res.data[0].get("batch_name", "Unknown")
        from app.routers.batch import sync_batch_status
        batch = sync_batch_status(db, batch_res.data[0])
        batch_status_val = batch.get("status")
        if batch_status_val == "CLOSED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot upload attendance for a CLOSED batch."
            )
        if batch_status_val == "COMPLETED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Training has ended and the assessment window is now open. Attendance upload is disabled."
            )
    
    try:
        contents = await file.read()
        uploaded_count = 0
        errors = []
        
        attendance_payloads = []
        audit_log_payloads = []
        
        # Pre-fetch existing attendance records for the batch in a single query
        existing_att = db.table("attendances").select("id, candidate_id, date, status, version").eq("batch_id", batch_id).execute()
        existing_att_map = {}
        if existing_att.data:
            for att in existing_att.data:
                cand_id = att["candidate_id"]
                date_val = att["date"]
                if date_val:
                    try:
                        if "T" in date_val:
                            dt = datetime.fromisoformat(date_val.replace('Z', '+00:00'))
                        else:
                            dt = datetime.strptime(date_val, "%Y-%m-%d")
                        existing_att_map[(cand_id, dt.date())] = att
                    except Exception as parse_err:
                        print(f"[Warn] Failed to parse attendance date {date_val}: {parse_err}")

        # If it's an Excel file
        if file.filename.endswith(".xlsx") or file.filename.endswith(".xls"):
            wb = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
            ws = wb.active
            
            # Find dates in Row 4, starting from Column 10 (J)
            session_dates = []
            c_idx = 10
            while True:
                val_date = ws.cell(row=4, column=c_idx).value
                if val_date is None:
                    break
                
                date_obj = None
                if isinstance(val_date, datetime):
                    date_obj = val_date
                elif isinstance(val_date, date_type):
                    date_obj = datetime.combine(val_date, datetime.min.time())
                else:
                    date_str = str(val_date).strip()
                    for fmt in ("%m-%d-%y", "%Y-%m-%d", "%m/%d/%y", "%Y/%m/%d"):
                        try:
                            date_obj = datetime.strptime(date_str, fmt)
                            break
                        except ValueError:
                            continue
                
                if date_obj is None:
                    break
                
                session_dates.append((c_idx, date_obj))
                c_idx += 1
                
            if not session_dates:
                return {"uploaded": 0, "errors": ["No valid session dates found in Row 4 (columns J onwards)"]}
                
            # First pass: collect unique emails in Excel sheet
            emails_in_sheet = set()
            r_idx = 5
            while True:
                email_val = ws.cell(row=r_idx, column=3).value # Column C is Email ID
                name_val = ws.cell(row=r_idx, column=2).value  # Column B is Name
                if not email_val and not name_val:
                    break
                if email_val:
                    emails_in_sheet.add(str(email_val).strip().lower())
                r_idx += 1

            # Pre-fetch candidate records and user records
            email_to_candidate = {}
            email_to_user_assigned = {}
            if emails_in_sheet:
                emails_list = list(emails_in_sheet)
                candidates_data = []
                for i in range(0, len(emails_list), 1000):
                    chunk = emails_list[i:i+1000]
                    res = db.table("candidates").select("id, email, batch_id").in_("email", chunk).execute()
                    if res.data:
                        candidates_data.extend(res.data)
                email_to_candidate = {c["email"].strip().lower(): c for c in candidates_data}

                users_data = []
                for i in range(0, len(emails_list), 1000):
                    chunk = emails_list[i:i+1000]
                    res = db.table("users").select("email, assigned_batches").in_("email", chunk).execute()
                    if res.data:
                        users_data.extend(res.data)
                email_to_user_assigned = {u["email"].strip().lower(): (u.get("assigned_batches", []) or []) for u in users_data}

            # Iterate through rows starting from row 5
            r_idx = 5
            while True:
                email_val = ws.cell(row=r_idx, column=3).value
                name_val = ws.cell(row=r_idx, column=2).value
                if not email_val and not name_val:
                    break
                    
                if not email_val:
                    errors.append(f"Row {r_idx}: Missing Email ID")
                    r_idx += 1
                    continue
                    
                email_clean = str(email_val).strip().lower()
                cand_info = email_to_candidate.get(email_clean)
                if not cand_info:
                    errors.append(f"Row {r_idx}: Candidate with email '{email_clean}' not found")
                    r_idx += 1
                    continue
                
                candidate_id = cand_info["id"]
                cand_batch_id = cand_info["batch_id"]
                
                # Verify mapping via user assigned_batches or fallback
                is_mapped = False
                assigned = email_to_user_assigned.get(email_clean, [])
                if batch_id in assigned:
                    is_mapped = True
                
                if not is_mapped and cand_batch_id == batch_id:
                    is_mapped = True
                    
                if not is_mapped:
                    errors.append(f"Row {r_idx}: Candidate with email '{email_clean}' is not mapped to batch")
                    r_idx += 1
                    continue
                
                # Iterate through date columns
                for col_idx, date_obj in session_dates:
                    status_val = ws.cell(row=r_idx, column=col_idx).value
                    if not status_val:
                        continue # Skip empty cells
                        
                    status_str = str(status_val).strip().upper()
                    if status_str not in ("P", "A", "L"):
                        continue
                        
                    mapped_status = "PRESENT" if status_str == "P" else "ABSENT" if status_str == "A" else "LEAVE"
                    
                    try:
                        existing_record = existing_att_map.get((candidate_id, date_obj.date()))
                        if existing_record:
                            old_status = existing_record.get("status", "")
                            if old_status != mapped_status:
                                new_version = existing_record.get("version", 1) + 1
                                attendance_payloads.append({
                                    "id": existing_record["id"],
                                    "batch_id": batch_id,
                                    "candidate_id": candidate_id,
                                    "date": existing_record["date"],
                                    "status": mapped_status,
                                    "version": new_version
                                })
                                audit_log_payloads.append({
                                    "attendance_id": existing_record["id"],
                                    "old_status": old_status,
                                    "new_status": mapped_status,
                                    "changed_by": current_user.get("email", ""),
                                    "changed_by_role": current_user.get("role", ""),
                                    "changed_at": datetime.utcnow().isoformat()
                                })
                        else:
                            attendance = Attendance(
                                batchId=batch_id,
                                candidateId=candidate_id,
                                date=date_obj.isoformat() if isinstance(date_obj, datetime) else date_obj,
                                status=AttendanceStatus[mapped_status]
                            )
                            attendance_payloads.append(attendance.to_dict())
                        uploaded_count += 1
                    except Exception as cell_err:
                        errors.append(f"Row {r_idx}, Col {col_idx} ({date_obj.date()}): {str(cell_err)}")
                        
                r_idx += 1
                
        else:
            # Handle CSV
            csv_rows = []
            candidate_ids_in_csv = set()
            reader = csv.DictReader(io.StringIO(contents.decode('utf-8')))
            for row_num, row in enumerate(reader, start=2):
                csv_rows.append((row_num, row))
                c_id = row.get("candidateId", "").strip()
                if c_id:
                    candidate_ids_in_csv.add(c_id)

            id_to_candidate = {}
            email_to_user_assigned = {}
            if candidate_ids_in_csv:
                cand_ids_list = list(candidate_ids_in_csv)
                candidates_data = []
                for i in range(0, len(cand_ids_list), 1000):
                    chunk = cand_ids_list[i:i+1000]
                    res = db.table("candidates").select("id, email, batch_id").in_("id", chunk).execute()
                    if res.data:
                        candidates_data.extend(res.data)
                id_to_candidate = {c["id"]: c for c in candidates_data}

                emails_to_fetch = [c["email"].strip().lower() for c in candidates_data if c.get("email")]
                users_data = []
                for i in range(0, len(emails_to_fetch), 1000):
                    chunk = emails_to_fetch[i:i+1000]
                    res = db.table("users").select("email, assigned_batches").in_("email", chunk).execute()
                    if res.data:
                        users_data.extend(res.data)
                email_to_user_assigned = {u["email"].strip().lower(): (u.get("assigned_batches", []) or []) for u in users_data}

            for row_num, row in csv_rows:
                try:
                    candidate_id = row.get("candidateId", "").strip()
                    date_str = row.get("date", "").strip()
                    att_status_raw = row.get("status", "").strip().upper()

                    # ── Validation: Missing candidate ID ────────────────────
                    if not candidate_id:
                        errors.append(f"Row {row_num}: Missing candidateId")
                        continue

                    # ── Validation: Invalid status ───────────────────────────
                    if att_status_raw not in ["PRESENT", "ABSENT", "LEAVE"]:
                        errors.append(f"Row {row_num}: Invalid status '{att_status_raw}'")
                        continue

                    # ── Validation: Candidate must exist ────────────────────
                    cand_info = id_to_candidate.get(candidate_id)
                    if not cand_info:
                        errors.append(f"Row {row_num}: Candidate ID '{candidate_id}' does not exist")
                        continue

                    # ── Validation: Candidate must belong to this batch ──────
                    cand_email = cand_info.get("email")
                    is_mapped = False
                    if cand_email:
                        cand_email_clean = cand_email.strip().lower()
                        assigned = email_to_user_assigned.get(cand_email_clean, [])
                        if batch_id in assigned:
                            is_mapped = True
                    
                    if not is_mapped:
                        if cand_info["batch_id"] == batch_id:
                            is_mapped = True
                            
                    if not is_mapped:
                        errors.append(f"Row {row_num}: Candidate '{candidate_id}' is not mapped to this batch")
                        continue

                    attendance_date = datetime.fromisoformat(date_str)

                    try:
                        existing_record = existing_att_map.get((candidate_id, attendance_date.date()))
                        if existing_record:
                            old_status = existing_record.get("status", "")
                            if old_status != att_status_raw:
                                new_version = existing_record.get("version", 1) + 1
                                attendance_payloads.append({
                                    "id": existing_record["id"],
                                    "batch_id": batch_id,
                                    "candidate_id": candidate_id,
                                    "date": existing_record["date"],
                                    "status": att_status_raw,
                                    "version": new_version
                                })
                                audit_log_payloads.append({
                                    "attendance_id": existing_record["id"],
                                    "old_status": old_status,
                                    "new_status": att_status_raw,
                                    "changed_by": current_user.get("email", ""),
                                    "changed_by_role": current_user.get("role", ""),
                                    "changed_at": datetime.utcnow().isoformat()
                                })
                        else:
                            attendance = Attendance(
                                batchId=batch_id,
                                candidateId=candidate_id,
                                date=attendance_date,
                                status=AttendanceStatus[att_status_raw]
                            )
                            attendance_payloads.append(attendance.to_dict())
                        uploaded_count += 1
                    except Exception as cell_err:
                        errors.append(f"Row {row_num}: {str(cell_err)}")
                except Exception as e:
                    errors.append(f"Row {row_num}: {str(e)}")

        # Bulk upsert attendance records in chunks of 1000
        if attendance_payloads:
            chunk_size = 1000
            for i in range(0, len(attendance_payloads), chunk_size):
                chunk = attendance_payloads[i:i + chunk_size]
                try:
                    db.table("attendances").upsert(chunk).execute()
                except Exception as db_err:
                    errors.append(f"Database batch update error (chunk {i//chunk_size + 1}): {str(db_err)}")
        
        # Bulk insert audit logs in chunks of 1000
        if audit_log_payloads:
            chunk_size = 1000
            for i in range(0, len(audit_log_payloads), chunk_size):
                chunk = audit_log_payloads[i:i + chunk_size]
                try:
                    db.table("attendance_audit_logs").insert(chunk).execute()
                except Exception as audit_err:
                    print(f"[Warn] Failed to write attendance audit logs: {audit_err}")

        try:
            from app.core.logging_helper import log_file_upload_and_notify
            log_file_upload_and_notify(
                user=current_user,
                filename=file.filename,
                file_type="ATTENDANCE",
                batch_id=batch_id,
                batch_name=batch_name,
                row_count=uploaded_count,
                status="SUCCESS"
            )
        except Exception as log_err:
            print(f"[Warn] Failed to log success: {log_err}")

        return {
            "uploaded": uploaded_count,
            "errors": errors
        }
    except Exception as e:
        try:
            from app.core.logging_helper import log_file_upload_and_notify
            log_file_upload_and_notify(
                user=current_user,
                filename=file.filename,
                file_type="ATTENDANCE",
                batch_id=batch_id,
                batch_name=batch_name,
                row_count=0,
                status="FAILED",
                error_msg=str(e)
            )
        except Exception as log_err:
            print(f"[Warn] Failed to log failure: {log_err}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/candidate/{candidate_id}", response_model=List[AttendanceResponse])
async def get_candidate_attendance(
    candidate_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get attendance records for a candidate"""
    db = get_db()
    check_candidate_access(db, current_user, candidate_id)
    
    try:
        result = db.table("attendances").select("*").eq("candidate_id", candidate_id).execute()
        return [AttendanceResponse(**row_to_api(att)) for att in result.data]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/batch/{batch_id}/sheet")
async def get_batch_attendance_sheet(
    batch_id: str,
    date: Optional[str] = None,
    pool_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Generate and download the Excel attendance sheet for a batch"""
    db = get_db()
    
    if current_user.get("role") not in ["TRAINER", "COORDINATOR", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized to access attendance sheets")
        
    check_batch_access(db, current_user, batch_id)
        
    try:
        batch_res = db.table("batches").select("*").eq("id", batch_id).execute()
        if not batch_res.data:
            batch_res = db.table("batches").select("*").eq("batch_id", batch_id).execute()
            if not batch_res.data:
                raise HTTPException(status_code=404, detail="Batch not found")
                
        batch_data = row_to_api(batch_res.data[0])
        batch_uuid = batch_res.data[0]["id"]
        
        from datetime import datetime as datetime_cls, date as date_cls, timedelta
        
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
        
        start_dt = datetime_cls.fromisoformat(batch_data["startDate"].replace('Z', '+00:00')) if isinstance(batch_data["startDate"], str) else batch_data["startDate"]
        end_dt = datetime_cls.fromisoformat(batch_data["endDate"].replace('Z', '+00:00')) if isinstance(batch_data["endDate"], str) else batch_data["endDate"]
        
        all_planned_dates = []
        curr = start_dt
        while curr <= end_dt:
            if curr.weekday() < 5:  # Monday to Friday
                date_str = curr.strftime("%Y-%m-%d")
                if date_str not in PUBLIC_HOLIDAYS:
                    all_planned_dates.append(date_str)
            curr += timedelta(days=1)
            
        # Update batch session dates in description if they are different or missing
        stored_session_dates = batch_data.get("sessionDates", [])
        if not stored_session_dates or sorted(stored_session_dates) != sorted(all_planned_dates):
            import json
            try:
                raw_desc = batch_res.data[0].get("description", "")
                desc_data = {}
                if raw_desc:
                    try:
                        desc_data = json.loads(raw_desc)
                    except Exception:
                        desc_data = {"text": raw_desc}
                desc_data["session_dates"] = all_planned_dates
                db.table("batches").update({
                    "description": json.dumps(desc_data)
                }).eq("id", batch_uuid).execute()
            except Exception as update_err:
                print(f"[Warn] Failed to update batch session dates in DB: {update_err}")

        # Determine focus_date and session_dates for the sheet
        focus_date = date_cls.today()
        session_dates = all_planned_dates
        
        if date:
            try:
                parsed_dt = datetime.strptime(date, "%Y-%m-%d")
                parsed_date = parsed_dt.strftime("%Y-%m-%d")
                session_dates = [parsed_date]
                focus_date = parsed_dt.date()
            except ValueError:
                try:
                    parsed_dt = datetime.fromisoformat(date.replace('Z', '+00:00'))
                    parsed_date = parsed_dt.strftime("%Y-%m-%d")
                    session_dates = [parsed_date]
                    focus_date = parsed_dt.date()
                except ValueError:
                    pass
                
        # Query users where role is TRAINEE and assigned_batches contains batch_uuid
        users_res = db.table("users").select("email").eq("role", "TRAINEE").cs("assigned_batches", [batch_uuid]).execute()
        emails = {u["email"].strip().lower() for u in users_res.data} if users_res.data else set()
        
        # Also query candidates directly where batch_id matches
        cand_direct_res = db.table("candidates").select("email").eq("batch_id", batch_uuid).execute()
        if cand_direct_res.data:
            for c in cand_direct_res.data:
                emails.add(c["email"].strip().lower())
                
        if emails:
            cand_res = db.table("candidates").select("*").in_("email", list(emails)).execute()
            candidates = []
            for c in cand_res.data:
                c_api = row_to_api(c)
                c_api["batchId"] = batch_uuid
                candidates.append(c_api)
        else:
            candidates = []
        
        # If pool_date is provided, filter candidates by onboarding_date from trainee_pool
        if pool_date:
            try:
                cand_emails = [c.get("email", "").strip().lower() for c in candidates if c.get("email")]
                if cand_emails:
                    pool_res = db.table("trainee_pool").select("email", "onboarding_date").eq("onboarding_date", pool_date).in_("email", cand_emails).execute()
                    if pool_res.data:
                        filtered_emails = {row.get("email", "").strip().lower() for row in pool_res.data}
                        candidates = [c for c in candidates if c.get("email", "").strip().lower() in filtered_emails]
                    else:
                        candidates = []
                else:
                    candidates = []
            except Exception as pool_filter_err:
                print(f"[Warn] Failed to filter candidates by pool date: {pool_filter_err}")
                
        candidates.sort(key=lambda x: x.get("fullName", "").lower())
        
        att_res = db.table("attendances").select("*").eq("batch_id", batch_uuid).execute()
        attendances = [row_to_api(a) for a in att_res.data]
        
        att_map = {}
        for att in attendances:
            cand_id = att.get("candidateId")
            try:
                date_str = datetime.fromisoformat(att.get("date").replace('Z', '+00:00')).strftime("%Y-%m-%d")
                att_map[(cand_id, date_str)] = att.get("status")
            except Exception:
                pass
                
        from openpyxl import Workbook
        from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
        from openpyxl.utils import get_column_letter
        from fastapi.responses import StreamingResponse
        import io
        
        wb = Workbook()
        ws = wb.active
        ws.title = "Attendance"
        ws.views.sheetView[0].showGridLines = True
        
        title_font = Font(name="Calibri", size=16, bold=True, color="1F497D")
        header_font = Font(name="Calibri", size=11, bold=True, color="000000")
        bold_font = Font(name="Calibri", size=11, bold=True)
        regular_font = Font(name="Calibri", size=11)
        
        center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
        left_align = Alignment(horizontal="left", vertical="center")
        
        thin_side = Side(border_style="thin", color="D3D3D3")
        thin_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
        
        name_email_fill = PatternFill(start_color="FADBD8", end_color="FADBD8", fill_type="solid")
        stat_label_fill = PatternFill(start_color="FAD0C4", end_color="FAD0C4", fill_type="solid")
        stat_header_fill = PatternFill(start_color="E5E7E9", end_color="E5E7E9", fill_type="solid")
        present_cell_fill = PatternFill(start_color="D4EFDF", end_color="D4EFDF", fill_type="solid")
        absent_cell_fill = PatternFill(start_color="FADBD8", end_color="FADBD8", fill_type="solid")
        leave_cell_fill = PatternFill(start_color="FCF3CF", end_color="FCF3CF", fill_type="solid")
        
        headers = [
            ("Sr no", 8),
            ("Name", 24),
            ("Email ID", 28),
            ("Total No of Training Connects (Planned)", 18),
            ("Total Days completed", 14),
            ("Remaining Training Days", 14),
            ("# Training Days Conducted", 14),
            ("# Training Days attended", 14),
            ("Attendance %", 14)
        ]
        
        ws.merge_cells("A1:I3")
        title_cell = ws["A1"]
        title_cell.value = "Attendance Tracker - " + batch_data.get("batchName", "Cohort")
        title_cell.font = title_font
        title_cell.alignment = center_align
        
        for r in range(1, 4):
            for c in range(1, 10):
                ws.cell(row=r, column=c).border = thin_border
                
        num_candidates = len(candidates)
        start_row_cand = 5
        end_row_cand = start_row_cand + num_candidates - 1
        
        for idx, date_str in enumerate(session_dates):
            col_idx = 10 + idx
            col_letter = get_column_letter(col_idx)
            
            ws.cell(row=1, column=col_idx, value=f'=COUNTIF({col_letter}{start_row_cand}:{col_letter}{end_row_cand}, "P")')
            ws.cell(row=1, column=col_idx).font = bold_font
            ws.cell(row=1, column=col_idx).alignment = center_align
            ws.cell(row=1, column=col_idx).border = thin_border
            ws.cell(row=1, column=col_idx).fill = stat_header_fill
            
            ws.cell(row=2, column=col_idx, value=f'=COUNTIF({col_letter}{start_row_cand}:{col_letter}{end_row_cand}, "A")')
            ws.cell(row=2, column=col_idx).font = bold_font
            ws.cell(row=2, column=col_idx).alignment = center_align
            ws.cell(row=2, column=col_idx).border = thin_border
            ws.cell(row=2, column=col_idx).fill = stat_header_fill
            
            ws.cell(row=3, column=col_idx, value=f'=IF((COUNTIF({col_letter}{start_row_cand}:{col_letter}{end_row_cand}, "P")+COUNTIF({col_letter}{start_row_cand}:{col_letter}{end_row_cand}, "A"))>0, COUNTIF({col_letter}{start_row_cand}:{col_letter}{end_row_cand}, "P")/(COUNTIF({col_letter}{start_row_cand}:{col_letter}{end_row_cand}, "P")+COUNTIF({col_letter}{start_row_cand}:{col_letter}{end_row_cand}, "A")), 0)')
            ws.cell(row=3, column=col_idx).font = bold_font
            ws.cell(row=3, column=col_idx).alignment = center_align
            ws.cell(row=3, column=col_idx).border = thin_border
            ws.cell(row=3, column=col_idx).number_format = '0%'
            ws.cell(row=3, column=col_idx).fill = stat_header_fill
            
        for col_idx, (header_text, width) in enumerate(headers, 1):
            cell = ws.cell(row=4, column=col_idx, value=header_text)
            cell.font = header_font
            cell.alignment = center_align
            cell.border = thin_border
            ws.column_dimensions[get_column_letter(col_idx)].width = width
            if col_idx in [1, 2, 3]:
                cell.fill = name_email_fill
            else:
                cell.fill = stat_label_fill
                
        session_colors = [
            PatternFill(start_color="D6EAF8", end_color="D6EAF8", fill_type="solid"),
            PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid"),
            PatternFill(start_color="FCF3CF", end_color="FCF3CF", fill_type="solid"),
            PatternFill(start_color="D4EFDF", end_color="D4EFDF", fill_type="solid"),
            PatternFill(start_color="EBDEF0", end_color="EBDEF0", fill_type="solid"),
        ]
        
        for idx, date_str in enumerate(session_dates):
            col_idx = 10 + idx
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            formatted_date = dt.strftime("%m-%d-%y")
            
            cell = ws.cell(row=4, column=col_idx, value=formatted_date)
            cell.font = header_font
            cell.alignment = center_align
            cell.border = thin_border
            cell.fill = session_colors[idx % len(session_colors)]
            ws.column_dimensions[get_column_letter(col_idx)].width = 12
            
        last_col_letter = get_column_letter(10 + len(session_dates) - 1) if session_dates else "I"
        
        # Calculate calendar days completed up to focus_date
        start_date = start_dt.date() if hasattr(start_dt, "date") else start_dt
        end_date = end_dt.date() if hasattr(end_dt, "date") else end_dt
        
        if focus_date < start_date:
            days_completed = 0
        elif focus_date > end_date:
            days_completed = (end_date - start_date).days + 1
        else:
            days_completed = (focus_date - start_date).days + 1
            
        remaining_connects = sum(1 for d in all_planned_dates if datetime.strptime(d, "%Y-%m-%d").date() > focus_date)
        
        for r_idx, trainee in enumerate(candidates, start_row_cand):
            trainee_id = trainee.get("id")
            
            cell = ws.cell(row=r_idx, column=1, value=r_idx - start_row_cand + 1)
            cell.font = regular_font
            cell.alignment = center_align
            cell.border = thin_border
            
            cell = ws.cell(row=r_idx, column=2, value=trainee.get("fullName"))
            cell.font = regular_font
            cell.alignment = left_align
            cell.border = thin_border
            
            cell = ws.cell(row=r_idx, column=3, value=trainee.get("email"))
            cell.font = regular_font
            cell.alignment = left_align
            cell.border = thin_border
            
            # Total Planned Connects (Column 4 / D)
            ws.cell(row=r_idx, column=4, value=len(all_planned_dates))
            ws.cell(row=r_idx, column=4).font = bold_font
            ws.cell(row=r_idx, column=4).alignment = center_align
            ws.cell(row=r_idx, column=4).border = thin_border
            
            # Conditionally populate days completed based on marked attendance/topics for focus_date
            focus_date_str = focus_date.strftime("%Y-%m-%d")
            is_focus_date_connect_day = focus_date_str in all_planned_dates
            trainee_att_marked = att_map.get((trainee_id, focus_date_str)) in ["PRESENT", "ABSENT", "LEAVE"]
            
            if is_focus_date_connect_day and not trainee_att_marked:
                val_days_completed = ""
            else:
                val_days_completed = days_completed

            # Total Days Completed (Column 5 / E)
            ws.cell(row=r_idx, column=5, value=val_days_completed)
            ws.cell(row=r_idx, column=5).font = regular_font
            ws.cell(row=r_idx, column=5).alignment = center_align
            ws.cell(row=r_idx, column=5).border = thin_border
            
            # Remaining connects (Column 6 / F)
            ws.cell(row=r_idx, column=6, value=remaining_connects)
            ws.cell(row=r_idx, column=6).font = regular_font
            ws.cell(row=r_idx, column=6).alignment = center_align
            ws.cell(row=r_idx, column=6).border = thin_border
            
            # Training Days Conducted (Column 7 / G)
            ws.cell(row=r_idx, column=7, value=f'=COUNTIF(J{r_idx}:{last_col_letter}{r_idx}, "P")+COUNTIF(J{r_idx}:{last_col_letter}{r_idx}, "A")+COUNTIF(J{r_idx}:{last_col_letter}{r_idx}, "L")' if session_dates else 0)
            ws.cell(row=r_idx, column=7).font = regular_font
            ws.cell(row=r_idx, column=7).alignment = center_align
            ws.cell(row=r_idx, column=7).border = thin_border
            
            # Training Days Attended (Column 8 / H)
            ws.cell(row=r_idx, column=8, value=f'=COUNTIF(J{r_idx}:{last_col_letter}{r_idx}, "P")' if session_dates else 0)
            ws.cell(row=r_idx, column=8).font = regular_font
            ws.cell(row=r_idx, column=8).alignment = center_align
            ws.cell(row=r_idx, column=8).border = thin_border
            
            # Attendance % (Column 9 / I)
            ws.cell(row=r_idx, column=9, value=f'=IF(G{r_idx}>0, H{r_idx}/G{r_idx}, 0)')
            ws.cell(row=r_idx, column=9).font = bold_font
            ws.cell(row=r_idx, column=9).alignment = center_align
            ws.cell(row=r_idx, column=9).border = thin_border
            ws.cell(row=r_idx, column=9).number_format = '0%'
            
            for idx, date_str in enumerate(session_dates):
                col_idx = 10 + idx
                status_raw = att_map.get((trainee_id, date_str))
                
                val = ""
                cell_fill = None
                if status_raw == "PRESENT":
                    val = "P"
                    cell_fill = present_cell_fill
                elif status_raw == "ABSENT":
                    val = "A"
                    cell_fill = absent_cell_fill
                elif status_raw == "LEAVE":
                    val = "L"
                    cell_fill = leave_cell_fill
                else:
                    from datetime import date as date_cls
                    today_str = date_cls.today().strftime("%Y-%m-%d")
                    if date_str < today_str:
                        val = "A"
                        cell_fill = absent_cell_fill
                        
                cell = ws.cell(row=r_idx, column=col_idx, value=val)
                cell.font = regular_font
                cell.alignment = center_align
                cell.border = thin_border
                if cell_fill:
                    cell.fill = cell_fill
                    
        file_stream = io.BytesIO()
        wb.save(file_stream)
        file_stream.seek(0)
        
        filename = f"Attendance_Sheet_{batch_data.get('batchName', 'Batch').replace(' ', '_')}.xlsx"
        headers = {
            'Content-Disposition': f'attachment; filename="{filename}"'
        }
        return StreamingResponse(
            file_stream,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers=headers
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/batch/{batch_id}", response_model=List[AttendanceResponse])
async def get_batch_attendance(
    batch_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all attendance records for a batch"""
    db = get_db()
    check_batch_access(db, current_user, batch_id)
    
    try:
        result = db.table("attendances").select("*").eq("batch_id", batch_id).execute()
        return [AttendanceResponse(**row_to_api(att)) for att in result.data]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{attendance_id}", response_model=AttendanceResponse)
async def update_attendance(
    attendance_id: str,
    attendance_data: AttendanceUpdate,
    current_user: dict = Depends(has_role("TRAINER", "COORDINATOR"))
):
    """Update attendance record"""
    db = get_db()
    check_attendance_access(db, current_user, attendance_id)
    
    try:
        # Get current record to increment version and check batch status
        current = db.table("attendances").select("*").eq("id", attendance_id).execute()
        
        if not current.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attendance record not found"
            )
            
        batch_id = current.data[0].get("batch_id")
        if batch_id:
            batch_res = db.table("batches").select("*").eq("id", batch_id).execute()
            if batch_res.data:
                from app.routers.batch import sync_batch_status
                batch = sync_batch_status(db, batch_res.data[0])
                if batch.get("status") == "CLOSED":
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Cannot update attendance for a CLOSED batch."
                    )
        
        current_version = current.data[0].get("version", 1)
        old_status = current.data[0].get("status", "")
        
        result = db.table("attendances").update({
            "status": attendance_data.status.value,
            "version": current_version + 1
        }).eq("id", attendance_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attendance record not found"
            )

        # Write audit log for this update
        _write_audit_log(
            db,
            attendance_id=attendance_id,
            old_status=old_status,
            new_status=attendance_data.status.value,
            changed_by=current_user.get("email", ""),
            changed_by_role=current_user.get("role", ""),
        )
        
        ret_val = AttendanceResponse(**row_to_api(result.data[0]))

        # Log ATTENDANCE_UPLOAD if updated by any role
        try:
            role_label = current_user.get("role", "User").title()
            user_name = current_user.get("fullName", role_label)
            batch_id = current.data[0].get("batch_id") if current.data else None
            if batch_id:
                batch_res = db.table("batches").select("batch_name").eq("id", batch_id).execute()
                batch_name = batch_res.data[0]["batch_name"] if batch_res.data else "Unknown"
                
                if current_user.get("role") == "TRAINEE":
                    msg = f"Trainee {user_name} updated attendance record for Batch '{batch_name}'."
                else:
                    msg = f"{role_label} {user_name} updated attendance record for Batch '{batch_name}'."
                
                db.table("notifications").insert({
                    "type": "ATTENDANCE_UPLOAD",
                    "message": msg,
                    "is_read": False,
                    "created_at": datetime.utcnow().isoformat()
                }).execute()
        except Exception as notif_err:
            print(f"[Warn] Failed to create ATTENDANCE_UPLOAD notification: {notif_err}")

        return ret_val
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
