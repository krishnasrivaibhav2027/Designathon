from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from datetime import datetime
from app.schemas.schemas import (
    AssessmentCreate, AssessmentUpdate, AssessmentResponse,
    BatchReportResponse
)
from app.core.database import get_db
from app.core.security import get_current_user, has_role
from app.models.models import Assessment, AssessmentResult, row_to_api
from app.services.topper_service import TopperService

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
        
        result = db.table("assessments").insert(assessment.to_dict()).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create assessment")
        
        return AssessmentResponse(**row_to_api(result.data[0]))
    except HTTPException:
        raise
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
        result = db.table("assessments").select("*").eq("candidate_id", candidate_id).execute()
        return [AssessmentResponse(**row_to_api(a)) for a in result.data]
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
        result = db.table("assessments").select("*").eq("batch_id", batch_id).execute()
        return [AssessmentResponse(**row_to_api(a)) for a in result.data]
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
        raw = assessment_data.model_dump(exclude_unset=True)
        
        # Map camelCase to snake_case
        field_map = {
            "assessmentName": "assessment_name",
            "totalScore": "total_score",
            "obtainedScore": "obtained_score",
        }
        
        update_dict = {}
        for key, value in raw.items():
            db_key = field_map.get(key, key)
            update_dict[db_key] = value
        
        # Recalculate percentage and result if scores changed
        if "obtained_score" in update_dict or "total_score" in update_dict:
            current = db.table("assessments").select("*").eq("id", assessment_id).execute()
            
            if not current.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Assessment not found"
                )
            
            current_row = current.data[0]
            total = update_dict.get("total_score", current_row.get("total_score"))
            obtained = update_dict.get("obtained_score", current_row.get("obtained_score"))
            
            update_dict["percentage"] = (obtained / total * 100) if total > 0 else 0
            update_dict["result"] = "PASS" if update_dict["percentage"] >= 40 else "FAIL"
        
        result = db.table("assessments").update(update_dict).eq("id", assessment_id).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assessment not found"
            )
        
        return AssessmentResponse(**row_to_api(result.data[0]))
    except HTTPException:
        raise
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
        batch_result = db.table("batches").select("*").eq("id", batch_id).execute()
        if not batch_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch not found"
            )
        
        batch = batch_result.data[0]
        
        assessments_result = db.table("assessments").select("*").eq("batch_id", batch_id).execute()
        assessments = assessments_result.data
        
        total_candidates = batch.get("candidates_count", 0)
        avg_score = 0
        passed_count = 0
        failed_count = 0
        
        if assessments:
            avg_score = sum([a.get("percentage", 0) for a in assessments]) / len(assessments)
            passed_count = sum(1 for a in assessments if a.get("result") == "PASS")
            failed_count = sum(1 for a in assessments if a.get("result") == "FAIL")
        
        attendance_result = db.table("attendances").select("id").eq("batch_id", batch_id).execute()
        
        return BatchReportResponse(
            batchId=batch_id,
            batchName=batch.get("batch_name"),
            totalCandidates=total_candidates,
            totalAttendance=len(attendance_result.data),
            averageScore=avg_score,
            assessmentsPassed=passed_count,
            assessmentsFailed=failed_count
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
