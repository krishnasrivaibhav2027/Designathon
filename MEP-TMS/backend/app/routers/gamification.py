from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any
from app.core.database import get_db
from app.core.security import get_current_user, has_role
from app.services.gamification_service import GamificationService

router = APIRouter(prefix="/api/gamification", tags=["gamification"])

class AwardPointsRequest(BaseModel):
    candidateId: str
    amount: int
    reason: str

@router.get("/ledger", response_model=List[Dict[str, Any]])
async def get_my_ledger(current_user: dict = Depends(get_current_user)):
    """Get the gamification ledger for the currently logged-in trainee"""
    db = get_db()
    email = current_user.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="User email not found in session context.")
    try:
        return GamificationService.get_candidate_ledger(db, email)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch points ledger: {str(e)}")

@router.get("/ledger/{email}", response_model=List[Dict[str, Any]])
async def get_trainee_ledger(
    email: str, 
    current_user: dict = Depends(has_role("ADMIN", "COORDINATOR", "TRAINER"))
):
    """Admin/Coordinator/Trainer only: Get gamification ledger for a trainee by email"""
    db = get_db()
    try:
        return GamificationService.get_candidate_ledger(db, email)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve ledger for {email}: {str(e)}")

@router.post("/award")
async def award_points(
    req: AwardPointsRequest,
    current_user: dict = Depends(has_role("ADMIN", "COORDINATOR", "TRAINER"))
):
    """Admin/Coordinator/Trainer only: Award bits to a trainee manually"""
    db = get_db()
    try:
        res = GamificationService.award_bits(
            db, 
            candidate_id=req.candidateId, 
            amount=req.amount, 
            reason=req.reason
        )
        if not res:
            raise HTTPException(status_code=400, detail="Failed to award bits. Check if Candidate ID exists.")
        return {
            "status": "success",
            "message": f"Successfully awarded {req.amount} bits.",
            "data": res
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error occurred during points award: {str(e)}")
