from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import row_to_api

router = APIRouter(prefix="/api/users", tags=["users"])

class PaginatedTrainersResponse(BaseModel):
    data: List[Dict[str, Any]]
    total: int
    page: int
    pages: int

class PaginatedTraineesResponse(BaseModel):
    data: List[Dict[str, Any]]
    total: int
    page: int
    pages: int

@router.get("/trainers", response_model=PaginatedTrainersResponse)
async def get_trainers(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1),
    current_user: dict = Depends(get_current_user)
):
    """Get paginated trainers with their resolved batch names"""
    db = get_db()
    start = (page - 1) * limit
    end = start + limit - 1

    try:
        # Fetch trainers
        result = db.table("users").select("*", count="exact").eq("role", "TRAINER").range(start, end).execute()
        total = result.count if result.count is not None else 0
        trainers = result.data if result.data else []

        # Fetch all batches to resolve batch names in python (efficient look-up)
        batches_res = db.table("batches").select("id, batch_name").execute()
        batch_map = {b["id"]: b["batch_name"] for b in batches_res.data} if batches_res.data else {}

        resolved_trainers = []
        for t in trainers:
            api_t = row_to_api(t)
            assigned_ids = api_t.get("assignedBatches") or []
            # Resolve ID array to name array
            batch_names = [batch_map.get(bid, bid) for bid in assigned_ids if bid in batch_map]
            api_t["batchNames"] = batch_names
            resolved_trainers.append(api_t)

        pages = (total + limit - 1) // limit if limit > 0 else 1

        return PaginatedTrainersResponse(
            data=resolved_trainers,
            total=total,
            page=page,
            pages=max(1, pages)
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/trainees", response_model=PaginatedTraineesResponse)
async def get_trainees(
    batch_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1),
    current_user: dict = Depends(get_current_user)
):
    """Get paginated trainees for a specific batch"""
    db = get_db()
    start = (page - 1) * limit
    end = start + limit - 1

    try:
        # Query candidates for the batch
        result = db.table("candidates").select("*", count="exact").eq("batch_id", batch_id).range(start, end).execute()
        total = result.count if result.count is not None else 0
        trainees = result.data if result.data else []

        # Resolve the single batch name
        batch_res = db.table("batches").select("batch_name").eq("id", batch_id).execute()
        batch_name = batch_res.data[0]["batch_name"] if batch_res.data else "Unknown Batch"

        resolved_trainees = []
        for t in trainees:
            api_t = row_to_api(t)
            api_t["batchName"] = batch_name
            resolved_trainees.append(api_t)

        pages = (total + limit - 1) // limit if limit > 0 else 1

        return PaginatedTraineesResponse(
            data=resolved_trainees,
            total=total,
            page=page,
            pages=max(1, pages)
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/me/candidate")
async def get_my_candidate(current_user: dict = Depends(get_current_user)):
    """Get the candidate record associated with the current user email"""
    db = get_db()
    email = current_user.get("email")
    try:
        res = db.table("candidates").select("*").eq("email", email).execute()
        if not res.data:
            # Try finding a mock candidate or return a default so it doesn't crash
            # Create a mock one if needed for the login profile
            fallback = {
                "id": "cand-mock-id",
                "fullName": current_user.get("fullName", "Trainee Candidate"),
                "email": email,
                "batchId": "BATCH-RN-2024",
                "phone": "+1-555-0199"
            }
            return fallback
        return row_to_api(res.data[0])
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
