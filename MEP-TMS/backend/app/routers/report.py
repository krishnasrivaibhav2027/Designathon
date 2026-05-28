from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import StreamingResponse
from typing import List
from datetime import datetime, timedelta
from app.schemas.schemas import (
    FeedbackCreate, FeedbackUpdate, FeedbackResponse, ToppersListResponse,
    DetailedFeedbackCreate, DetailedFeedbackResponse, FeedbackWindowStatus
)
from app.core.database import get_db
from app.core.security import get_current_user, has_role
from app.models.models import Feedback, row_to_api
from app.services.topper_service import TopperService

router = APIRouter(prefix="/api/report", tags=["report"])


# ─── Helpers ────────────────────────────────────────────────────────────────

FEEDBACK_WINDOW_DAYS_BEFORE = 3   # window opens N days before end date

def _get_feedback_window(end_date_str: str):
    """Return (window_open: bool, opens_on, closes_on) for a batch end date."""
    try:
        end_dt = datetime.fromisoformat(end_date_str.replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        return False, None, None
    opens_on = end_dt - timedelta(days=FEEDBACK_WINDOW_DAYS_BEFORE)
    closes_on = end_dt
    now = datetime.utcnow()
    window_open = opens_on <= now <= closes_on
    return window_open, opens_on, closes_on


def _coordinator_owns_batch(db, batch_id: str, user_id: str) -> bool:
    """Return True if the coordinator created this batch (or is a legacy admin)."""
    batch_res = db.table("batches").select("description").eq("id", batch_id).execute()
    if not batch_res.data:
        return False
    desc_str = batch_res.data[0].get("description")
    creator = ""
    if desc_str and desc_str.startswith("{"):
        try:
            import json
            creator = json.loads(desc_str).get("created_by", "")
        except Exception:
            pass
    legacy_admins = {"df772f20-b396-4a3b-8ddc-68fcd54b6060", "728f45b3-f6bd-4cfa-860f-a42c89682b33"}
    return creator == user_id or (not creator and user_id in legacy_admins)


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
    
    role = current_user.get("role")
    user_id = current_user.get("sub") or current_user.get("email") or ""
    if role == "COORDINATOR" and not _coordinator_owns_batch(db, batch_id, user_id):
        raise HTTPException(status_code=403, detail="Access denied to this batch's reports")
                
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
                raise HTTPException(status_code=403, detail="Access denied to this batch's toppers")
                
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
    """Trigger sending feedback request emails to all candidates in the batch.
    Respects the feedback window: opens 3 days before end date, closes on end date."""
    db = get_db()
    from app.services.email_service import EmailService

    role = current_user.get("role")
    user_id = current_user.get("sub") or current_user.get("email") or ""
    if role == "COORDINATOR" and not _coordinator_owns_batch(db, batch_id, user_id):
        raise HTTPException(status_code=403, detail="Access denied to request feedback for this batch")

    try:
        batch_result = db.table("batches").select("*").eq("id", batch_id).execute()
        if not batch_result.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")

        batch = batch_result.data[0]
        batch_name = batch.get("batch_name", "")
        end_date_str = batch.get("end_date", "")

        # Check feedback window
        window_open, opens_on, closes_on = _get_feedback_window(end_date_str)
        if not window_open:
            now = datetime.utcnow()
            if opens_on and now < opens_on:
                raise HTTPException(
                    status_code=400,
                    detail=f"Feedback window has not opened yet. It opens on {opens_on.strftime('%d %b %Y')}."
                )
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Feedback window has closed (batch end date has passed)."
                )

        candidates_result = db.table("candidates").select("*").eq("batch_id", batch_id).execute()
        candidates = candidates_result.data or []

        sent_count = 0
        failed_count = 0
        form_url = f"http://localhost:5173/feedback/form?batchId={batch_id}"

        for c in candidates:
            email = c.get("email")
            name = c.get("full_name")
            if email and name:
                success = await EmailService.send_feedback_request(
                    email, name, batch_name,
                    batch_id=batch_id,
                    feedback_form_url=form_url
                )
                if success:
                    sent_count += 1
                else:
                    failed_count += 1

        return {
            "message": "Feedback request process completed",
            "total_candidates": len(candidates),
            "sent": sent_count,
            "failed": failed_count,
            "form_url": form_url,
        }
    except HTTPException:
        raise
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
        
        role = current_user.get("role")
        user_id = current_user.get("sub") or current_user.get("email") or ""
        if role == "COORDINATOR":
            filtered = []
            for b in batches:
                desc_str = b.get("description")
                creator = ""
                if desc_str and desc_str.startswith("{"):
                    try:
                        import json
                        creator = json.loads(desc_str).get("created_by", "")
                    except:
                        pass
                is_original = not creator and user_id in ["df772f20-b396-4a3b-8ddc-68fcd54b6060", "728f45b3-f6bd-4cfa-860f-a42c89682b33"]
                if creator == user_id or is_original:
                    filtered.append(b)
            batches = filtered
            
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
        batches_res = db.table("batches").select("id, batch_name, description").execute()
        batches = batches_res.data or []
        
        role = current_user.get("role")
        user_id = current_user.get("sub") or current_user.get("email") or ""
        if role == "COORDINATOR":
            filtered = []
            for b in batches:
                desc_str = b.get("description")
                creator = ""
                if desc_str and desc_str.startswith("{"):
                    try:
                        import json
                        creator = json.loads(desc_str).get("created_by", "")
                    except:
                        pass
                is_original = not creator and user_id in ["df772f20-b396-4a3b-8ddc-68fcd54b6060", "728f45b3-f6bd-4cfa-860f-a42c89682b33"]
                if creator == user_id or is_original:
                    filtered.append(b)
            batches = filtered
        
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


# ─── Feedback Window Status ──────────────────────────────────────────────────

@router.get("/feedback/window/{batch_id}", response_model=FeedbackWindowStatus)
async def get_feedback_window(
    batch_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Return whether the feedback window is currently open for a batch."""
    db = get_db()
    batch_result = db.table("batches").select("id, batch_name, end_date").eq("id", batch_id).execute()
    if not batch_result.data:
        raise HTTPException(status_code=404, detail="Batch not found")

    batch = batch_result.data[0]
    end_date_str = batch.get("end_date", "")
    window_open, opens_on, closes_on = _get_feedback_window(end_date_str)

    days_until_close = None
    if closes_on:
        delta = closes_on - datetime.utcnow()
        days_until_close = max(0, delta.days)

    return FeedbackWindowStatus(
        batchId=batch_id,
        batchName=batch.get("batch_name", ""),
        endDate=datetime.fromisoformat(end_date_str.replace("Z", "+00:00")),
        windowOpen=window_open,
        windowOpensOn=opens_on,
        windowClosesOn=closes_on,
        daysUntilClose=days_until_close,
    )


# ─── Detailed Feedback Submission (from the feedback form) ──────────────────

@router.post("/feedback/detailed", response_model=DetailedFeedbackResponse)
async def submit_detailed_feedback(feedback_data: DetailedFeedbackCreate):
    """
    Submit a detailed feedback form response.
    This endpoint is public (no auth required) so trainees can submit via the
    emailed link without needing to log in.
    """
    db = get_db()

    # Validate batch exists
    batch_result = db.table("batches").select("id, batch_name, end_date").eq("id", feedback_data.batchId).execute()
    if not batch_result.data:
        raise HTTPException(status_code=404, detail="Batch not found")

    batch = batch_result.data[0]
    end_date_str = batch.get("end_date", "")
    window_open, opens_on, closes_on = _get_feedback_window(end_date_str)
    if not window_open:
        now = datetime.utcnow()
        if opens_on and now < opens_on:
            raise HTTPException(
                status_code=400,
                detail=f"Feedback window has not opened yet. It opens on {opens_on.strftime('%d %b %Y')}."
            )
        else:
            raise HTTPException(status_code=400, detail="Feedback window has closed.")

    try:
        row = {
            "batch_id": feedback_data.batchId,
            "candidate_id": feedback_data.candidateId,
            "respondent_name": feedback_data.respondentName,
            "respondent_email": feedback_data.respondentEmail,
            "batch_no_and_trainer": feedback_data.batchNoAndTrainer,
            "takeaway1": feedback_data.takeaway1,
            "takeaway2": feedback_data.takeaway2,
            "takeaway3": feedback_data.takeaway3,
            "improvements": feedback_data.improvements,
            "course_impact": feedback_data.courseImpact,
            "trainer_rating": feedback_data.trainerRating,
            "assignments_helpful": feedback_data.assignmentsHelpful,
            "demonstrations_helpful": feedback_data.demonstrationsHelpful,
            "trainer_support_adequate": feedback_data.trainerSupportAdequate,
            "technical_discussions_helpful": feedback_data.technicalDiscussionsHelpful,
            "other_comments": feedback_data.otherComments,
            "submitted_at": datetime.utcnow().isoformat(),
        }
        result = db.table("detailed_feedbacks").insert(row).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to save feedback")

        saved = result.data[0]
        return DetailedFeedbackResponse(
            id=saved.get("id", ""),
            batchId=saved.get("batch_id", ""),
            candidateId=saved.get("candidate_id"),
            respondentName=saved.get("respondent_name"),
            respondentEmail=saved.get("respondent_email"),
            batchNoAndTrainer=saved.get("batch_no_and_trainer"),
            takeaway1=saved.get("takeaway1"),
            takeaway2=saved.get("takeaway2"),
            takeaway3=saved.get("takeaway3"),
            improvements=saved.get("improvements"),
            courseImpact=saved.get("course_impact"),
            trainerRating=saved.get("trainer_rating", 1),
            assignmentsHelpful=saved.get("assignments_helpful"),
            demonstrationsHelpful=saved.get("demonstrations_helpful"),
            trainerSupportAdequate=saved.get("trainer_support_adequate"),
            technicalDiscussionsHelpful=saved.get("technical_discussions_helpful"),
            otherComments=saved.get("other_comments"),
            submittedAt=datetime.fromisoformat(saved.get("submitted_at", datetime.utcnow().isoformat())),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── Get Detailed Feedback for a Batch ──────────────────────────────────────

@router.get("/feedback/detailed/{batch_id}")
async def get_detailed_feedback(
    batch_id: str,
    current_user: dict = Depends(has_role("ADMIN", "COORDINATOR", "TRAINER"))
):
    """Get all detailed feedback responses for a batch."""
    db = get_db()

    role = current_user.get("role")
    user_id = current_user.get("sub") or current_user.get("email") or ""
    if role == "COORDINATOR" and not _coordinator_owns_batch(db, batch_id, user_id):
        raise HTTPException(status_code=403, detail="Access denied to this batch's feedback")

    try:
        result = db.table("detailed_feedbacks").select("*").eq("batch_id", batch_id).order("submitted_at").execute()
        return result.data or []
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── Export Detailed Feedback as Excel ──────────────────────────────────────

@router.get("/feedback/detailed/{batch_id}/export")
async def export_detailed_feedback_excel(
    batch_id: str,
    current_user: dict = Depends(has_role("ADMIN", "COORDINATOR", "TRAINER"))
):
    """
    Download all detailed feedback responses for a batch as an Excel file.
    The sheet format matches the Microsoft Forms export layout.
    """
    import io
    import openpyxl
    from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
    from openpyxl.utils import get_column_letter

    db = get_db()

    role = current_user.get("role")
    user_id = current_user.get("sub") or current_user.get("email") or ""
    if role == "COORDINATOR" and not _coordinator_owns_batch(db, batch_id, user_id):
        raise HTTPException(status_code=403, detail="Access denied")

    batch_result = db.table("batches").select("batch_name").eq("id", batch_id).execute()
    batch_name = batch_result.data[0].get("batch_name", batch_id) if batch_result.data else batch_id

    result = db.table("detailed_feedbacks").select("*").eq("batch_id", batch_id).order("submitted_at").execute()
    rows = result.data or []

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Feedback Responses"

    header_fill = PatternFill(start_color="1F497D", end_color="1F497D", fill_type="solid")
    header_font = Font(name="Calibri", bold=True, color="FFFFFF", size=11)
    center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    left = Alignment(horizontal="left", vertical="center", wrap_text=True)
    thin = Side(border_style="thin", color="D3D3D3")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)

    columns = [
        ("ID", 6),
        ("Start time", 18),
        ("Completion time", 18),
        ("Email", 28),
        ("Name", 22),
        ("Email Id", 28),
        ("Batch No and Trainer Name", 28),
        ("Top Takeaway 1", 40),
        ("Top Takeaway 2", 40),
        ("Top Takeaway 3", 40),
        ("What could have been done better?", 40),
        ("Impact of this course on you?", 40),
        ("Trainer Rating (1–5)", 14),
        ("Assignments helpful?", 20),
        ("Demonstrations helpful?", 20),
        ("Trainer support adequate?", 20),
        ("Technical discussions helpful?", 20),
        ("Other Comments", 40),
    ]

    for col_idx, (header_text, width) in enumerate(columns, 1):
        cell = ws.cell(row=1, column=col_idx, value=header_text)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center
        cell.border = border
        ws.column_dimensions[get_column_letter(col_idx)].width = width

    ws.row_dimensions[1].height = 36

    alt_fill = PatternFill(start_color="EBF5FB", end_color="EBF5FB", fill_type="solid")

    for r_idx, row in enumerate(rows, 2):
        fill = alt_fill if r_idx % 2 == 0 else None
        submitted_at = row.get("submitted_at", "")

        values = [
            r_idx - 1,
            submitted_at,
            submitted_at,
            "anonymous",
            row.get("respondent_name", ""),
            row.get("respondent_email", ""),
            row.get("batch_no_and_trainer", ""),
            row.get("takeaway1", ""),
            row.get("takeaway2", ""),
            row.get("takeaway3", ""),
            row.get("improvements", ""),
            row.get("course_impact", ""),
            row.get("trainer_rating", ""),
            row.get("assignments_helpful", ""),
            row.get("demonstrations_helpful", ""),
            row.get("trainer_support_adequate", ""),
            row.get("technical_discussions_helpful", ""),
            row.get("other_comments", ""),
        ]

        for col_idx, val in enumerate(values, 1):
            cell = ws.cell(row=r_idx, column=col_idx, value=val)
            cell.font = Font(name="Calibri", size=11)
            cell.alignment = left if col_idx > 4 else center
            cell.border = border
            if fill:
                cell.fill = fill

        ws.row_dimensions[r_idx].height = 20

    file_stream = io.BytesIO()
    wb.save(file_stream)
    file_stream.seek(0)

    safe_name = batch_name.replace(" ", "_")
    return StreamingResponse(
        file_stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="Feedback_{safe_name}.xlsx"'}
    )
