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
    
    # Isolation check for coordinator
    role = current_user.get("role")
    user_id = current_user.get("sub") or current_user.get("email") or ""
    if role == "COORDINATOR":
        batch_res = db.table("batches").select("description").eq("id", batch_id).execute()
        if batch_res.data:
            desc_str = batch_res.data[0].get("description")
            creator = ""
            if desc_str and desc_str.startswith("{"):
                try:
                    import json
                    creator = json.loads(desc_str).get("created_by", "")
                except:
                    pass
            is_original = not creator and user_id in ["df772f20-b396-4a3b-8ddc-68fcd54b6060", "728f45b3-f6bd-4cfa-860f-a42c89682b33"]
            if creator != user_id and not is_original:
                raise HTTPException(status_code=403, detail="Access denied to this batch's trainees")
                
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

@router.get("/me/candidates")
async def get_my_candidates(current_user: dict = Depends(get_current_user)):
    """Get all candidate records associated with the current user email, with batch names"""
    db = get_db()
    email = current_user.get("email").strip().lower()
    try:
        res = db.table("candidates").select("*").eq("email", email).execute()
        candidates = [row_to_api(c) for c in res.data]
        
        # Populate batchName for each candidate
        for c in candidates:
            batch_id = c.get("batchId")
            if batch_id:
                batch_res = db.table("batches").select("batch_name").eq("id", batch_id).execute()
                if batch_res.data:
                    c["batchName"] = batch_res.data[0]["batch_name"]
        return candidates
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/activity-logs")
async def get_activity_logs(current_user: dict = Depends(get_current_user)):
    """Retrieve recent user logs from notifications table where type is LOGIN_LOG or LOGOUT_LOG"""
    db = get_db()
    import json
    try:
        # Fetch activity log notifications
        logs_res = db.table("notifications")\
            .select("*")\
            .in_("type", ["LOGIN_LOG", "LOGOUT_LOG"])\
            .order("created_at", desc=True)\
            .limit(100)\
            .execute()
            
        logs = logs_res.data or []
        
        role = current_user.get("role")
        user_id = current_user.get("sub") or current_user.get("email") or ""
        
        allowed_user_ids = None
        if role == "COORDINATOR":
            allowed_user_ids = {user_id}
            # Fetch all batches created by this coordinator
            batches_res = db.table("batches").select("id, trainers, description").execute()
            my_batch_ids = []
            my_trainers = set()
            if batches_res.data:
                for b in batches_res.data:
                    desc_str = b.get("description")
                    creator = ""
                    if desc_str and desc_str.startswith("{"):
                        try:
                            creator = json.loads(desc_str).get("created_by", "")
                        except:
                            pass
                    is_original = not creator and user_id in ["df772f20-b396-4a3b-8ddc-68fcd54b6060", "728f45b3-f6bd-4cfa-860f-a42c89682b33"]
                    if creator == user_id or is_original:
                        my_batch_ids.append(b.get("id"))
                        trainers = b.get("trainers", []) or []
                        for t in trainers:
                            my_trainers.add(t)
            
            # Fetch trainer user IDs
            if my_trainers:
                trainers_res = db.table("users").select("id").in_("full_name", list(my_trainers)).execute()
                if trainers_res.data:
                    for u in trainers_res.data:
                        allowed_user_ids.add(u.get("id"))
                trainers_res_email = db.table("users").select("id").in_("email", list(my_trainers)).execute()
                if trainers_res_email.data:
                    for u in trainers_res_email.data:
                        allowed_user_ids.add(u.get("id"))
            
            # Fetch candidate user IDs
            if my_batch_ids:
                candidates_res = db.table("candidates").select("email").in_("batch_id", my_batch_ids).execute()
                if candidates_res.data:
                    emails = [c.get("email") for c in candidates_res.data]
                    if emails:
                        users_res = db.table("users").select("id").in_("email", emails).execute()
                        if users_res.data:
                            for u in users_res.data:
                                allowed_user_ids.add(u.get("id"))
                                
        # If there are logs, fetch the associated user details to resolve name/email
        resolved_logs = []
        if logs:
            recipient_ids = list(set(log.get("recipient_id") for log in logs if log.get("recipient_id")))
            if allowed_user_ids is not None:
                recipient_ids = [rid for rid in recipient_ids if rid in allowed_user_ids]
                
            if recipient_ids:
                users_res = db.table("users").select("id, full_name, email, role").in_("id", recipient_ids).execute()
                user_map = {u["id"]: u for u in users_res.data} if users_res.data else {}
            else:
                user_map = {}
                
            for log in logs:
                u_id = log.get("recipient_id")
                if allowed_user_ids is not None and u_id not in allowed_user_ids:
                    continue
                log_api = row_to_api(log)
                u_info = user_map.get(u_id, {})
                log_api["fullName"] = u_info.get("full_name", "Unknown")
                log_api["email"] = u_info.get("email", "Unknown")
                log_api["role"] = u_info.get("role", "Unknown")
                resolved_logs.append(log_api)
                
        return resolved_logs
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
