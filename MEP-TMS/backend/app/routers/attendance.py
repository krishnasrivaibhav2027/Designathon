from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from typing import List
from datetime import datetime, date as date_type
from app.schemas.schemas import (
    AttendanceCreate, AttendanceUpdate, AttendanceResponse,
    AttendanceBatchResponse
)
from app.core.database import get_db
from app.core.security import get_current_user, has_role
from app.models.models import Attendance, AttendanceStatus
from bson.objectid import ObjectId
import csv
import io

router = APIRouter(prefix="/api/attendance", tags=["attendance"])

@router.post("/mark", response_model=AttendanceResponse)
async def mark_attendance(attendance_data: AttendanceCreate, current_user: dict = Depends(has_role("TRAINER", "COORDINATOR"))):
    """Mark attendance for a candidate"""
    db = get_db()
    
    try:
        # Check if attendance already marked for today
        existing = await db["attendances"].find_one({
            "batchId": attendance_data.batchId,
            "candidateId": attendance_data.candidateId,
            "date": {
                "$gte": datetime.combine(date_type.today(), datetime.min.time()),
                "$lt": datetime.combine(date_type.today(), datetime.max.time())
            }
        })
        
        if existing:
            # Update existing attendance
            result = await db["attendances"].update_one(
                {"_id": existing["_id"]},
                {
                    "$set": {
                        "status": attendance_data.status.value,
                        "updatedAt": datetime.utcnow(),
                        "$inc": {"version": 1}
                    }
                }
            )
            updated = await db["attendances"].find_one({"_id": existing["_id"]})
            return AttendanceResponse(**updated)
        
        # Create new attendance record
        attendance = Attendance(
            batchId=attendance_data.batchId,
            candidateId=attendance_data.candidateId,
            date=attendance_data.date,
            status=attendance_data.status
        )
        
        result = await db["attendances"].insert_one(attendance.to_dict())
        created = await db["attendances"].find_one({"_id": result.inserted_id})
        
        return AttendanceResponse(**created)
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
                status = row.get("status").upper()
                
                if status not in ["PRESENT", "ABSENT", "LEAVE"]:
                    errors.append(f"Row {row_num}: Invalid status '{status}'")
                    continue
                
                attendance = Attendance(
                    batchId=batch_id,
                    candidateId=candidate_id,
                    date=attendance_date,
                    status=AttendanceStatus[status]
                )
                
                await db["attendances"].insert_one(attendance.to_dict())
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
        attendances = await db["attendances"].find({"candidateId": candidate_id}).to_list(None)
        return [AttendanceResponse(**att) for att in attendances]
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
        attendances = await db["attendances"].find({"batchId": batch_id}).to_list(None)
        return [AttendanceResponse(**att) for att in attendances]
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
        result = await db["attendances"].update_one(
            {"_id": ObjectId(attendance_id)},
            {
                "$set": {
                    "status": attendance_data.status.value,
                    "updatedAt": datetime.utcnow()
                },
                "$inc": {"version": 1}
            }
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attendance record not found"
            )
        
        updated = await db["attendances"].find_one({"_id": ObjectId(attendance_id)})
        return AttendanceResponse(**updated)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
