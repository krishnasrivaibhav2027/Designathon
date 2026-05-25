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

@router.post("/feedback/request/{batch_id}")
async def request_feedback(
    batch_id: str,
    current_user: dict = Depends(has_role("ADMIN", "COORDINATOR"))
):
    """Trigger sending feedback request emails to all candidates in the batch"""
    db = get_db()
    from app.services.email_service import EmailService
    
    try:
        # Fetch batch
        batch_result = db.table("batches").select("*").eq("id", batch_id).execute()
        if not batch_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch not found"
            )
        batch = batch_result.data[0]
        batch_name = batch.get("batch_name")
        
        # Fetch all candidates in the batch
        candidates_result = db.table("candidates").select("*").eq("batch_id", batch_id).execute()
        candidates = candidates_result.data or []
        
        sent_count = 0
        failed_count = 0
        
        for c in candidates:
            email = c.get("email")
            name = c.get("full_name")
            if email and name:
                success = await EmailService.send_feedback_request(email, name, batch_name)
                if success:
                    sent_count += 1
                else:
                    failed_count += 1
                    
        return {
            "message": "Feedback request process completed",
            "total_candidates": len(candidates),
            "sent": sent_count,
            "failed": failed_count
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/progress-tracker")
async def get_progress_tracker(current_user: dict = Depends(get_current_user)):
    """Calculate average trainee assessment scores grouped by course week"""
    db = get_db()
    try:
        # Fetch all batches to get their start_dates
        batches_res = db.table("batches").select("*").execute()
        batches = batches_res.data or []
        batch_map = {b["id"]: b for b in batches}
        
        # Fetch all assessments
        assessments_res = db.table("assessments").select("*").execute()
        assessments = assessments_res.data or []
        
        # Group assessment scores by week number
        weeks_data = {}
        
        for a in assessments:
            batch_id = a.get("batch_id")
            if not batch_id or batch_id not in batch_map:
                continue
            
            batch = batch_map[batch_id]
            start_date_str = batch.get("start_date")
            created_at_str = a.get("created_at")
            
            if not start_date_str or not created_at_str:
                continue
                
            try:
                # Parse datetimes (handle both Z suffix and other ISO formats)
                start_date = datetime.fromisoformat(start_date_str.replace("Z", "+00:00"))
                created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                
                diff = created_at - start_date
                week_num = max(1, (diff.days // 7) + 1)
                
                if week_num not in weeks_data:
                    weeks_data[week_num] = []
                weeks_data[week_num].append(a.get("percentage", 0))
            except Exception as parse_err:
                print(f"[Warn] Error parsing dates: {parse_err}")
                continue
                
        # Format the result for Recharts
        chart_data = []
        for week_num in sorted(weeks_data.keys()):
            scores = weeks_data[week_num]
            avg_score = sum(scores) / len(scores) if scores else 0
            chart_data.append({
                "week": f"Week {week_num}",
                "score": round(avg_score, 1)
            })
            
        return chart_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/toppers/all/leaderboard")
async def get_all_toppers(
    limit: int = 5,
    current_user: dict = Depends(get_current_user)
):
    """Get top performing trainees across all batches"""
    db = get_db()
    try:
        # Get all batches
        batches_res = db.table("batches").select("id, batch_name").execute()
        batches = batches_res.data or []
        
        all_toppers = []
        for batch in batches:
            batch_id = batch["id"]
            batch_name = batch["batch_name"]
            toppers = await TopperService.calculate_batch_toppers(batch_id)
            for t in toppers:
                t["batchName"] = batch_name
                all_toppers.append(t)
                
        # Sort all toppers by overallScore descending
        all_toppers.sort(key=lambda x: x["overallScore"], reverse=True)
        
        # Filter: average attendance > 60% and overall score > 50%
        filtered_toppers = [
            t for t in all_toppers
            if t.get("attendancePercentage", 0) > 60 and t.get("overallScore", 0) > 50
        ]
        
        return filtered_toppers[:limit]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
