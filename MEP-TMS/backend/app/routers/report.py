from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from datetime import datetime
from app.schemas.schemas import FeedbackCreate, FeedbackUpdate, FeedbackResponse, ToppersListResponse
from app.core.database import get_db
from app.core.security import get_current_user, has_role
from app.models.models import Feedback, row_to_api
from app.services.topper_service import TopperService

router = APIRouter(prefix="/api/report", tags=["report"])

@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    feedback_data: FeedbackCreate,
    current_user: dict = Depends(get_current_user)
):
    """Submit feedback/rating"""
    db = get_db()
    
    try:
        feedback = Feedback(
            batchId=feedback_data.batchId,
            candidateId=feedback_data.candidateId,
            rating=feedback_data.rating,
            comments=feedback_data.comments
        )
        
        result = db.table("feedbacks").insert(feedback.to_dict()).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to submit feedback")
        
        return FeedbackResponse(**row_to_api(result.data[0]))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/feedback/batch/{batch_id}", response_model=List[FeedbackResponse])
async def get_batch_feedback(
    batch_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get feedback for batch"""
    db = get_db()
    
    try:
        result = db.table("feedbacks").select("*").eq("batch_id", batch_id).execute()
        return [FeedbackResponse(**row_to_api(f)) for f in result.data]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/feedback/candidate/{candidate_id}", response_model=List[FeedbackResponse])
async def get_candidate_feedback(
    candidate_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get feedback for candidate"""
    db = get_db()
    
    try:
        result = db.table("feedbacks").select("*").eq("candidate_id", candidate_id).execute()
        return [FeedbackResponse(**row_to_api(f)) for f in result.data]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/toppers/{batch_id}", response_model=ToppersListResponse)
async def get_batch_toppers(
    batch_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get toppers for batch"""
    db = get_db()
    
    try:
        batch_result = db.table("batches").select("*").eq("id", batch_id).execute()
        if not batch_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch not found"
            )
        
        batch = batch_result.data[0]
        toppers = await TopperService.get_top_performers(batch_id, limit=10)
        
        return ToppersListResponse(
            batchId=batch_id,
            batchName=batch.get("batch_name"),
            toppers=toppers
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/rank/candidate/{candidate_id}/batch/{batch_id}")
async def get_candidate_rank(
    candidate_id: str,
    batch_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get candidate rank in batch"""
    try:
        rank_data = await TopperService.get_candidate_rank(batch_id, candidate_id)
        return rank_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
