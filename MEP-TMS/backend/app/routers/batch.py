from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from app.schemas.schemas import (
    BatchCreate, BatchUpdate, BatchResponse, 
    CandidateCreate, CandidateResponse,
    AttendanceBatchResponse
)
from app.core.database import get_db
from app.core.security import get_current_user, has_role
from app.models.models import Batch, Candidate, BatchStatus, row_to_api
import uuid
from datetime import datetime

router = APIRouter(prefix="/api/batch", tags=["batch"])

@router.post("/create", response_model=BatchResponse)
async def create_batch(batch_data: BatchCreate, current_user: dict = Depends(has_role("ADMIN", "COORDINATOR"))):
    """Create a new batch"""
    db = get_db()
    
    batch = Batch(
        batchId=f"BATCH-{uuid.uuid4().hex[:8].upper()}",
        batchName=batch_data.batchName,
        startDate=batch_data.startDate,
        endDate=batch_data.endDate,
        trainers=batch_data.trainers,
        description=batch_data.description
    )
    
    result = db.table("batches").insert(batch.to_dict()).execute()
    
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create batch")
    
    created_batch = row_to_api(result.data[0])
    return BatchResponse(**created_batch)

@router.get("/list", response_model=List[BatchResponse])
async def list_batches(current_user: dict = Depends(get_current_user)):
    """Get all batches"""
    db = get_db()
    
    result = db.table("batches").select("*").execute()
    return [BatchResponse(**row_to_api(batch)) for batch in result.data]

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
        return BatchResponse(**row_to_api(result.data[0]))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{batch_id}", response_model=BatchResponse)
async def update_batch(batch_id: str, batch_data: BatchUpdate, current_user: dict = Depends(has_role("ADMIN", "COORDINATOR"))):
    """Update batch"""
    db = get_db()
    
    try:
        update_data = {}
        raw = batch_data.model_dump(exclude_unset=True)
        
        # Map camelCase fields to snake_case for DB
        field_map = {
            "batchName": "batch_name",
            "startDate": "start_date",
            "endDate": "end_date",
        }
        
        for key, value in raw.items():
            db_key = field_map.get(key, key)
            if isinstance(value, datetime):
                update_data[db_key] = value.isoformat()
            elif hasattr(value, 'value'):  # Enum
                update_data[db_key] = value.value
            else:
                update_data[db_key] = value
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        result = db.table("batches").update(update_data).eq("id", batch_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch not found"
            )
        
        return BatchResponse(**row_to_api(result.data[0]))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{batch_id}")
async def delete_batch(batch_id: str, current_user: dict = Depends(has_role("ADMIN"))):
    """Delete batch"""
    db = get_db()
    
    try:
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
async def add_candidate(batch_id: str, candidate_data: CandidateCreate, current_user: dict = Depends(has_role("COORDINATOR", "TRAINER"))):
    """Add candidate to batch"""
    db = get_db()
    
    try:
        # Check if batch exists
        batch_result = db.table("batches").select("id").eq("id", batch_id).execute()
        if not batch_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch not found"
            )
        
        candidate = Candidate(
            email=candidate_data.email,
            fullName=candidate_data.fullName,
            registrationNumber=f"REG-{uuid.uuid4().hex[:6].upper()}",
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
