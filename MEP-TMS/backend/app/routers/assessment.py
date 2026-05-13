from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from datetime import datetime
from app.schemas.schemas import (
    AssessmentCreate, AssessmentUpdate, AssessmentResponse,
    BatchReportResponse
)
from app.core.database import get_db
from app.core.security import get_current_user, has_role
from app.models.models import Assessment, AssessmentResult
from app.services.topper_service import TopperService
from bson.objectid import ObjectId

router = APIRouter(prefix="/api/assessment", tags=["assessment"])

@router.post("/create", response_model=AssessmentResponse)
async def create_assessment(
    assessment_data: AssessmentCreate,
    current_user: dict = Depends(has_role("TRAINER", "COORDINATOR"))
):
    """Create assessment record"""
    db = get_db()
    
    try:
        assessment = Assessment(
            batchId=assessment_data.batchId,
            candidateId=assessment_data.candidateId,
            assessmentName=assessment_data.assessmentName,
            totalScore=assessment_data.totalScore,
            obtainedScore=assessment_data.obtainedScore
        )
        
        result = await db["assessments"].insert_one(assessment.to_dict())
        created = await db["assessments"].find_one({"_id": result.inserted_id})
        
        return AssessmentResponse(**created)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/candidate/{candidate_id}", response_model=List[AssessmentResponse])
async def get_candidate_assessments(
    candidate_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get assessments for a candidate"""
    db = get_db()
    
    try:
        assessments = await db["assessments"].find({"candidateId": candidate_id}).to_list(None)
        return [AssessmentResponse(**a) for a in assessments]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/batch/{batch_id}", response_model=List[AssessmentResponse])
async def get_batch_assessments(
    batch_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all assessments for a batch"""
    db = get_db()
    
    try:
        assessments = await db["assessments"].find({"batchId": batch_id}).to_list(None)
        return [AssessmentResponse(**a) for a in assessments]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{assessment_id}", response_model=AssessmentResponse)
async def update_assessment(
    assessment_id: str,
    assessment_data: AssessmentUpdate,
    current_user: dict = Depends(has_role("TRAINER", "COORDINATOR"))
):
    """Update assessment"""
    db = get_db()
    
    try:
        update_dict = assessment_data.dict(exclude_unset=True)
        
        # Recalculate percentage and result if scores changed
        if "obtainedScore" in update_dict or "totalScore" in update_dict:
            current = await db["assessments"].find_one({"_id": ObjectId(assessment_id)})
            total = update_dict.get("totalScore", current.get("totalScore"))
            obtained = update_dict.get("obtainedScore", current.get("obtainedScore"))
            
            update_dict["percentage"] = (obtained / total * 100) if total > 0 else 0
            update_dict["result"] = "PASS" if update_dict["percentage"] >= 40 else "FAIL"
        
        update_dict["updatedAt"] = datetime.utcnow()
        
        result = await db["assessments"].update_one(
            {"_id": ObjectId(assessment_id)},
            {"$set": update_dict}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assessment not found"
            )
        
        updated = await db["assessments"].find_one({"_id": ObjectId(assessment_id)})
        return AssessmentResponse(**updated)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/batch/{batch_id}/report", response_model=BatchReportResponse)
async def get_batch_report(
    batch_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get assessment report for batch"""
    db = get_db()
    
    try:
        batch = await db["batches"].find_one({"_id": ObjectId(batch_id)})
        if not batch:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch not found"
            )
        
        assessments = await db["assessments"].find({"batchId": batch_id}).to_list(None)
        
        total_candidates = batch.get("candidatesCount", 0)
        avg_score = 0
        passed_count = 0
        failed_count = 0
        
        if assessments:
            avg_score = sum([a.get("percentage", 0) for a in assessments]) / len(assessments)
            passed_count = sum(1 for a in assessments if a.get("result") == "PASS")
            failed_count = sum(1 for a in assessments if a.get("result") == "FAIL")
        
        return BatchReportResponse(
            batchId=batch_id,
            batchName=batch.get("batchName"),
            totalCandidates=total_candidates,
            totalAttendance=len(await db["attendances"].find({"batchId": batch_id}).to_list(None)),
            averageScore=avg_score,
            assessmentsPassed=passed_count,
            assessmentsFailed=failed_count
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
