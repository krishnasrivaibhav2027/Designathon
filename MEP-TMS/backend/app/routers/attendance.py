from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from typing import List
from datetime import datetime, date as date_type
from app.schemas.schemas import (
    AttendanceCreate, AttendanceUpdate, AttendanceResponse,
    AttendanceBatchResponse
)
from app.core.database import get_db
from app.core.security import get_current_user, has_role
from app.models.models import Attendance, AttendanceStatus, row_to_api
import csv
import io

router = APIRouter(prefix="/api/attendance", tags=["attendance"])

@router.post("/mark", response_model=AttendanceResponse)
async def mark_attendance(attendance_data: AttendanceCreate, current_user: dict = Depends(has_role("TRAINER", "COORDINATOR", "TRAINEE"))):
    """Mark attendance for a candidate"""
    db = get_db()
    
    if current_user.get("role") == "TRAINEE":
        cand_res = db.table("candidates").select("id").eq("email", current_user.get("email")).execute()
        if not cand_res.data or (cand_res.data[0].get("id") != attendance_data.candidateId and "cand-mock-id" != attendance_data.candidateId):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Trainees can only mark their own attendance")
            
    try:
        # Check if attendance already marked for today
        today_start = datetime.combine(date_type.today(), datetime.min.time()).isoformat()
        today_end = datetime.combine(date_type.today(), datetime.max.time()).isoformat()
        
        existing = db.table("attendances").select("*") \
            .eq("batch_id", attendance_data.batchId) \
            .eq("candidate_id", attendance_data.candidateId) \
            .gte("date", today_start) \
            .lt("date", today_end) \
            .execute()
        
        if existing.data:
            # Update existing attendance
            record = existing.data[0]
            result = db.table("attendances").update({
                "status": attendance_data.status.value,
                "version": record.get("version", 1) + 1
            }).eq("id", record["id"]).execute()
            
            if not result.data:
                raise HTTPException(status_code=500, detail="Failed to update attendance")
            
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

        # Log ATTENDANCE_UPLOAD if marked by Trainer
        if current_user.get("role") == "TRAINER":
            try:
                batch_res = db.table("batches").select("batch_name").eq("id", attendance_data.batchId).execute()
                batch_name = batch_res.data[0]["batch_name"] if batch_res.data else "Unknown"
                db.table("notifications").insert({
                    "type": "ATTENDANCE_UPLOAD",
                    "message": f"Trainer {current_user.get('fullName', 'Trainer')} marked/updated attendance for Batch '{batch_name}'.",
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
    current_user: dict = Depends(has_role("COORDINATOR"))
):
    """Bulk upload attendance from CSV"""
    db = get_db()
    
    try:
        # Read CSV file
        contents = await file.read()
        reader = csv.DictReader(io.StringIO(contents.decode('utf-8')))
        
        uploaded_count = 0
        errors = []
        
        for row_num, row in enumerate(reader, start=2):
            try:
                candidate_id = row.get("candidateId")
                attendance_date = datetime.fromisoformat(row.get("date"))
                att_status = row.get("status").upper()
                
                if att_status not in ["PRESENT", "ABSENT", "LEAVE"]:
                    errors.append(f"Row {row_num}: Invalid status '{att_status}'")
                    continue
                
                attendance = Attendance(
                    batchId=batch_id,
                    candidateId=candidate_id,
                    date=attendance_date,
                    status=AttendanceStatus[att_status]
                )
                
                db.table("attendances").insert(attendance.to_dict()).execute()
                uploaded_count += 1
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        
        return {
            "uploaded": uploaded_count,
            "errors": errors
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/candidate/{candidate_id}", response_model=List[AttendanceResponse])
async def get_candidate_attendance(
    candidate_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get attendance records for a candidate"""
    db = get_db()
    
    try:
        result = db.table("attendances").select("*").eq("candidate_id", candidate_id).execute()
        return [AttendanceResponse(**row_to_api(att)) for att in result.data]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/batch/{batch_id}", response_model=List[AttendanceResponse])
async def get_batch_attendance(
    batch_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all attendance records for a batch"""
    db = get_db()
    
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
    
    try:
        # Get current record to increment version
        current = db.table("attendances").select("version").eq("id", attendance_id).execute()
        
        if not current.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attendance record not found"
            )
        
        current_version = current.data[0].get("version", 1)
        
        result = db.table("attendances").update({
            "status": attendance_data.status.value,
            "version": current_version + 1
        }).eq("id", attendance_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attendance record not found"
            )
        
        ret_val = AttendanceResponse(**row_to_api(result.data[0]))

        # Log ATTENDANCE_UPLOAD if updated by Trainer
        if current_user.get("role") == "TRAINER":
            try:
                batch_id = current.data[0].get("batch_id") if current.data else None
                if batch_id:
                    batch_res = db.table("batches").select("batch_name").eq("id", batch_id).execute()
                    batch_name = batch_res.data[0]["batch_name"] if batch_res.data else "Unknown"
                    db.table("notifications").insert({
                        "type": "ATTENDANCE_UPLOAD",
                        "message": f"Trainer {current_user.get('fullName', 'Trainer')} updated attendance record for Batch '{batch_name}'.",
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
