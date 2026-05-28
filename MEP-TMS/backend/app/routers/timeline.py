# app/routers/timeline.py
from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from datetime import datetime
import json

from app.core.database import get_db
from app.core.security import get_current_user, has_role
from app.models.models import row_to_api
from app.core.config import settings

router = APIRouter(prefix="/api/batch", tags=["timeline"])

# Pydantic Schemas for AI Generation & JSON serialization
class DayTarget(BaseModel):
    day_number: int = Field(description="The index number of the training day (1-based)")
    date: str = Field(description="The ISO date string formatted as YYYY-MM-DD for this training session")
    topic: str = Field(description="Title of the topic or main objective for this day")
    subtopics: List[str] = Field(description="List of subtopics to cover on this day")

class WeekTarget(BaseModel):
    week_number: int = Field(description="The index number of the training week (1-based)")
    week_title: str = Field(description="High-level title/overview of the week's curriculum focus")
    days: List[DayTarget] = Field(description="List of training days belonging to this week")

class TargetsTimelineSchema(BaseModel):
    weeks: List[WeekTarget] = Field(description="Weekly and daily target timeline schedule")

class SaveScheduleRequest(BaseModel):
    weeks: List[dict]

class AdjustProgressRequest(BaseModel):
    candidateId: str
    currentDay: int

def generate_even_distribution(session_dates: List[str], topics: List[str]) -> dict:
    """Fallback algorithm to evenly distribute curriculum topics across session dates"""
    if not session_dates:
        return {"weeks": []}
    if not topics:
        topics = ["Training Core Curriculum"]
        
    num_days = len(session_dates)
    num_topics = len(topics)
    days_per_topic = max(1, num_days // num_topics)
    
    weeks = []
    current_day_idx = 0
    week_num = 1
    
    while current_day_idx < num_days:
        week_days = []
        for d in range(5):
            if current_day_idx >= num_days:
                break
            date_str = session_dates[current_day_idx]
            day_num = current_day_idx + 1
            
            topic_idx = min(current_day_idx // days_per_topic, num_topics - 1)
            raw_topic = topics[topic_idx]
            
            # Parse topic and subtopics
            colon_idx = raw_topic.find(":")
            if colon_idx != -1:
                topic_name = raw_topic[:colon_idx].strip()
                subtopics = [s.strip() for s in raw_topic[colon_idx+1:].split(",") if s.strip()]
            else:
                topic_name = raw_topic.strip()
                subtopics = ["Core concepts and practical exercises"]
                
            week_days.append({
                "day_number": day_num,
                "date": date_str,
                "topic": f"{topic_name} - Day {day_num}",
                "subtopics": subtopics
            })
            current_day_idx += 1
            
        if week_days:
            first_day_topic = week_days[0]["topic"]
            dash_idx = first_day_topic.find(" - Day ")
            week_title = first_day_topic[:dash_idx] if dash_idx != -1 else first_day_topic
            
            weeks.append({
                "week_number": week_num,
                "week_title": week_title,
                "days": week_days
            })
            week_num += 1
            
    return {"weeks": weeks}


@router.post("/{batch_id}/schedule/generate")
async def generate_batch_schedule(
    batch_id: str,
    current_user: dict = Depends(has_role("ADMIN", "COORDINATOR", "TRAINER"))
):
    """Generate weekly and daily targets schedule for a batch. Fallbacks to even distribution if Gemini is unavailable."""
    db = get_db()
    
    # 1. Fetch batch
    batch_res = db.table("batches").select("*").eq("id", batch_id).execute()
    if not batch_res.data:
        raise HTTPException(status_code=404, detail="Batch not found")
    batch_row = batch_res.data[0]
    
    # Parse description JSON
    desc_str = batch_row.get("description", "")
    desc_json = {}
    if desc_str:
        try:
            desc_json = json.loads(desc_str)
        except Exception:
            desc_json = {"text": desc_str}
            
    session_dates = desc_json.get("session_dates", [])
    topics = desc_json.get("topics", [])
    
    if not session_dates:
        raise HTTPException(status_code=400, detail="This batch has no training session dates generated. Ensure start and end dates are correct.")
        
    schedule_data = None
    
    # 2. Check if Gemini API key exists
    has_api_key = settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your_gemini_api_key_here" and settings.GEMINI_API_KEY.strip() != ""
    
    if has_api_key:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            
            # Format prompt for Gemini
            formatted_topics = "\n".join([f"- {t}" for t in topics])
            prompt = f"""You are a technical training coordinator. Create a detailed day-by-day learning path timeline for the course batch: {batch_row.get("batch_name")}.
            
            Start Date: {batch_row.get("start_date")}
            End Date: {batch_row.get("end_date")}
            Number of Session Days: {len(session_dates)}
            Session Dates: {', '.join(session_dates)}
            
            Curriculum Topics to Cover:
            {formatted_topics}
            
            Instructions:
            1. Distribute the curriculum topics logically across the {len(session_dates)} session dates.
            2. Group the days into weeks (exactly 5 training days per week, or fewer for short/partial weeks).
            3. For each day, map it to a date from the Session Dates list (sequentially) and provide a concise topic and specific subtopic list to study.
            """
            
            llm = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash",
                google_api_key=settings.GEMINI_API_KEY,
                temperature=0.2
            )
            
            structured_llm = llm.with_structured_output(TargetsTimelineSchema)
            response = await structured_llm.ainvoke(prompt)
            
            # Convert structured response to dict
            schedule_data = {
                "weeks": [
                    {
                        "week_number": w.week_number,
                        "week_title": w.week_title,
                        "days": [
                            {
                                "day_number": d.day_number,
                                "date": d.date,
                                "topic": d.topic,
                                "subtopics": d.subtopics
                            } for d in w.days
                        ]
                    } for w in response.weeks
                ]
            }
        except Exception as gemini_err:
            print(f"[Warn] Gemini timeline generation failed: {gemini_err}. Falling back to even distribution.")
            schedule_data = generate_even_distribution(session_dates, topics)
    else:
        schedule_data = generate_even_distribution(session_dates, topics)
        
    # 3. Save to description JSON
    desc_json["targets"] = schedule_data["weeks"]
    
    db.table("batches").update({
        "description": json.dumps(desc_json)
    }).eq("id", batch_id).execute()
    
    return {"status": "success", "targets": schedule_data["weeks"]}


@router.get("/{batch_id}/schedule")
async def get_batch_schedule(batch_id: str, current_user: dict = Depends(get_current_user)):
    """Retrieve the targets timeline schedule for a batch"""
    db = get_db()
    
    batch_res = db.table("batches").select("description").eq("id", batch_id).execute()
    if not batch_res.data:
        raise HTTPException(status_code=404, detail="Batch not found")
        
    desc_str = batch_res.data[0].get("description", "")
    targets = []
    if desc_str:
        try:
            desc_json = json.loads(desc_str)
            targets = desc_json.get("targets", [])
        except Exception:
            pass
            
    return {"targets": targets}


@router.put("/{batch_id}/schedule")
async def save_batch_schedule(
    batch_id: str,
    req: SaveScheduleRequest,
    current_user: dict = Depends(has_role("ADMIN", "COORDINATOR", "TRAINER"))
):
    """Save manual targets schedule updates"""
    db = get_db()
    
    batch_res = db.table("batches").select("description").eq("id", batch_id).execute()
    if not batch_res.data:
        raise HTTPException(status_code=404, detail="Batch not found")
        
    desc_str = batch_res.data[0].get("description", "")
    desc_json = {}
    if desc_str:
        try:
            desc_json = json.loads(desc_str)
        except Exception:
            desc_json = {"text": desc_str}
            
    desc_json["targets"] = req.weeks
    
    db.table("batches").update({
        "description": json.dumps(desc_json)
    }).eq("id", batch_id).execute()
    
    return {"status": "success", "targets": req.weeks}


@router.get("/{batch_id}/progress")
async def get_batch_progress(batch_id: str, current_user: dict = Depends(get_current_user)):
    """Fetch progress details of all candidates in a batch"""
    db = get_db()
    
    # 1. Get batch candidates using our robust assigned_batches lookup
    users_res = db.table("users").select("email").eq("role", "TRAINEE").cs("assigned_batches", [batch_id]).execute()
    emails = {u["email"].strip().lower() for u in users_res.data} if users_res.data else set()
    
    cand_direct_res = db.table("candidates").select("email").eq("batch_id", batch_id).execute()
    if cand_direct_res.data:
        for c in cand_direct_res.data:
            emails.add(c["email"].strip().lower())
            
    if not emails:
        return []
        
    candidates_res = db.table("candidates").select("*").in_("email", list(emails)).execute()
    
    progress_list = []
    for c in candidates_res.data:
        prog = c.get("progress")
        if not prog or not isinstance(prog, dict):
            prog = {"completed_days": [], "current_day": 1}
            
        progress_list.append({
            "candidateId": c["id"],
            "fullName": c["full_name"],
            "email": c["email"],
            "registrationNumber": c["registration_number"],
            "progress": prog
        })
        
    progress_list.sort(key=lambda x: x["fullName"].lower())
    return progress_list


@router.post("/{batch_id}/progress/mark-complete")
async def mark_day_completed(
    batch_id: str,
    current_user: dict = Depends(has_role("TRAINEE"))
):
    """Trainee marks their current target day as completed, moving to the next day"""
    db = get_db()
    email = current_user.get("email").strip().lower()
    
    # 1. Find candidate record
    cand_res = db.table("candidates").select("*").eq("email", email).execute()
    if not cand_res.data:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
        
    candidate = cand_res.data[0]
    candidate_id = candidate["id"]
    
    # Check progress column
    prog = candidate.get("progress")
    if not prog or not isinstance(prog, dict):
        prog = {"completed_days": [], "current_day": 1}
        
    current_day = prog.get("current_day", 1)
    completed_days = prog.get("completed_days", [])
    
    if current_day not in completed_days:
        completed_days.append(current_day)
        
    next_day = current_day + 1
    
    updated_progress = {
        "completed_days": completed_days,
        "current_day": next_day
    }
    
    db.table("candidates").update({
        "progress": updated_progress
    }).eq("id", candidate_id).execute()
    
    return {"status": "success", "progress": updated_progress}


@router.post("/{batch_id}/progress/adjust")
async def adjust_trainee_progress(
    batch_id: str,
    req: AdjustProgressRequest,
    current_user: dict = Depends(has_role("ADMIN", "COORDINATOR", "TRAINER"))
):
    """Trainer adjusts a candidate's timeline progress position manually"""
    db = get_db()
    
    # Fetch candidate
    cand_res = db.table("candidates").select("*").eq("id", req.candidateId).execute()
    if not cand_res.data:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
        
    candidate = cand_res.data[0]
    prog = candidate.get("progress")
    if not prog or not isinstance(prog, dict):
        prog = {"completed_days": [], "current_day": 1}
        
    new_day = req.currentDay
    # Sync completed days (all days up to new_day - 1 are marked completed)
    completed_days = list(range(1, new_day))
    
    updated_progress = {
        "completed_days": completed_days,
        "current_day": new_day
    }
    
    db.table("candidates").update({
        "progress": updated_progress
    }).eq("id", req.candidateId).execute()
    
    return {"status": "success", "progress": updated_progress}
