from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from app.schemas.schemas import (
    BatchCreate, BatchUpdate, BatchResponse, 
    CandidateCreate, CandidateResponse,
    AttendanceBatchResponse
)
from app.core.database import get_db
from app.core.security import get_current_user, has_role
from app.models.models import Batch, Candidate, BatchStatus
from bson.objectid import ObjectId
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
    
    result = await db["batches"].insert_one(batch.to_dict())
    created_batch = await db["batches"].find_one({"_id": result.inserted_id})
    
    return BatchResponse(**created_batch)

@router.get("/list", response_model=List[BatchResponse])
async def list_batches(current_user: dict = Depends(get_current_user)):
    """Get all batches"""
    db = get_db()
    
    batches = await db["batches"].find().to_list(None)
    return [BatchResponse(**batch) for batch in batches]

@router.get("/{batch_id}", response_model=BatchResponse)
async def get_batch(batch_id: str, current_user: dict = Depends(get_current_user)):
    """Get batch by ID"""
    db = get_db()
    
    try:
        batch = await db["batches"].find_one({"_id": ObjectId(batch_id)})
        if not batch:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch not found"
            )
        return BatchResponse(**batch)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{batch_id}", response_model=BatchResponse)
async def update_batch(batch_id: str, batch_data: BatchUpdate, current_user: dict = Depends(has_role("ADMIN", "COORDINATOR"))):
    """Update batch"""
    db = get_db()
    
    try:
        update_data = batch_data.dict(exclude_unset=True)
        update_data["updatedAt"] = datetime.utcnow()
        
        result = await db["batches"].update_one(
            {"_id": ObjectId(batch_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch not found"
            )
        
        updated_batch = await db["batches"].find_one({"_id": ObjectId(batch_id)})
        return BatchResponse(**updated_batch)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{batch_id}")
async def delete_batch(batch_id: str, current_user: dict = Depends(has_role("ADMIN"))):
    """Delete batch"""
    db = get_db()
    
    try:
        result = await db["batches"].delete_one({"_id": ObjectId(batch_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch not found"
            )
        
        # Delete associated data
        await db["candidates"].delete_many({"batchId": batch_id})
        await db["attendances"].delete_many({"batchId": batch_id})
        await db["assessments"].delete_many({"batchId": batch_id})
        
        return {"message": "Batch deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{batch_id}/candidates", response_model=CandidateResponse)
async def add_candidate(batch_id: str, candidate_data: CandidateCreate, current_user: dict = Depends(has_role("COORDINATOR", "TRAINER"))):
    """Add candidate to batch"""
    db = get_db()
    
    try:
        # Check if batch exists
        batch = await db["batches"].find_one({"_id": ObjectId(batch_id)})
        if not batch:
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
        
        result = await db["candidates"].insert_one(candidate.to_dict())
        
        # Update batch candidate count
        await db["batches"].update_one(
            {"_id": ObjectId(batch_id)},
            {"$inc": {"candidatesCount": 1}, "$set": {"updatedAt": datetime.utcnow()}}
        )
        
        created_candidate = await db["candidates"].find_one({"_id": result.inserted_id})
        return CandidateResponse(**created_candidate)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{batch_id}/candidates", response_model=List[CandidateResponse])
async def get_batch_candidates(batch_id: str, current_user: dict = Depends(get_current_user)):
    """Get all candidates in a batch"""
    db = get_db()
    
    candidates = await db["candidates"].find({"batchId": batch_id}).to_list(None)
    return [CandidateResponse(**candidate) for candidate in candidates]

@router.get("/{batch_id}/attendance-summary", response_model=List[AttendanceBatchResponse])
async def get_batch_attendance_summary(batch_id: str, current_user: dict = Depends(get_current_user)):
    """Get attendance summary for batch"""
    db = get_db()
    
    try:
        # Get all attendances for batch
        attendances = await db["attendances"].find({"batchId": batch_id}).to_list(None)
        
        # Group by date
        date_summary = {}
        for attendance in attendances:
            date_key = attendance["date"].date().isoformat()
            if date_key not in date_summary:
                date_summary[date_key] = {
                    "date": attendance["date"],
                    "presentCount": 0,
                    "absentCount": 0,
                    "leaveCount": 0
                }
            
            status = attendance["status"]
            if status == "PRESENT":
                date_summary[date_key]["presentCount"] += 1
            elif status == "ABSENT":
                date_summary[date_key]["absentCount"] += 1
            elif status == "LEAVE":
                date_summary[date_key]["leaveCount"] += 1
        
        return [AttendanceBatchResponse(**summary) for summary in date_summary.values()]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
