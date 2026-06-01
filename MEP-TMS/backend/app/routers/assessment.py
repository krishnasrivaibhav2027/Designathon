from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from datetime import datetime
from app.schemas.schemas import (
    AssessmentCreate, AssessmentUpdate, AssessmentResponse,
    BatchReportResponse, BatchResponse
)
from app.core.database import get_db
from app.core.security import get_current_user, has_role, check_batch_access, check_candidate_access, check_assessment_access
from app.models.models import Assessment, AssessmentResult, row_to_api
from app.services.topper_service import TopperService
from pydantic import BaseModel, Field

class MCQQuestion(BaseModel):
    question: str = Field(description="The multiple choice question text")
    options: List[str] = Field(description="Exactly 4 options for the question")
    correctAnswer: str = Field(description="The correct answer, which MUST be a string copied exactly from one of the options in the options list. Character-for-character matching is required.")

class MCQTopicGroup(BaseModel):
    topic: str = Field(description="The name of the topic group")
    questions: List[MCQQuestion] = Field(description="Exactly 3 challenging multiple-choice questions (MCQs)")

class AssessmentQuestionsSchema(BaseModel):
    topics: List[MCQTopicGroup] = Field(description="List of assessment questions grouped by topic")

router = APIRouter(prefix="/api/assessment", tags=["assessment"])

@router.post("/create", response_model=AssessmentResponse)
async def create_assessment(
    assessment_data: AssessmentCreate,
    current_user: dict = Depends(has_role("TRAINER", "COORDINATOR", "TRAINEE"))
):
    """Create assessment record"""
    db = get_db()
    check_batch_access(db, current_user, assessment_data.batchId)
    if current_user.get("role") == "TRAINEE":
        check_candidate_access(db, current_user, assessment_data.candidateId)
    
    # Check if batch is CLOSED
    batch_res = db.table("batches").select("*").eq("id", assessment_data.batchId).execute()
    if batch_res.data:
        from app.routers.batch import sync_batch_status
        batch = sync_batch_status(db, batch_res.data[0])
        if batch.get("status") == "CLOSED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot create assessment for a CLOSED batch."
            )
    
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
        
        ret_val = AssessmentResponse(**row_to_api(result.data[0]))
        
        # Sync score to matching report card
        from app.services.assessment_sync_service import AssessmentSyncService
        AssessmentSyncService.sync_assessment_to_report_card(
            db,
            assessment_data.batchId,
            assessment_data.candidateId,
            assessment_data.assessmentName,
            assessment_data.obtainedScore,
            assessment_data.totalScore
        )

        # Log ASSESSMENT_UPLOAD if graded by Trainer
        if current_user.get("role") == "TRAINER":
            try:
                batch_res = db.table("batches").select("batch_name").eq("id", assessment_data.batchId).execute()
                batch_name = batch_res.data[0]["batch_name"] if batch_res.data else "Unknown"
                db.table("notifications").insert({
                    "type": "ASSESSMENT_UPLOAD",
                    "message": f"Trainer {current_user.get('fullName', 'Trainer')} graded assessment '{assessment_data.assessmentName}' for Batch '{batch_name}'.",
                    "is_read": False,
                    "created_at": datetime.utcnow().isoformat()
                }).execute()
            except Exception as notif_err:
                print(f"[Warn] Failed to create ASSESSMENT_UPLOAD notification: {notif_err}")

        return ret_val
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
    check_candidate_access(db, current_user, candidate_id)
    
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
    check_batch_access(db, current_user, batch_id)
    
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
    check_assessment_access(db, current_user, assessment_id)
    
    # Check if batch is CLOSED
    current_assessment_res = db.table("assessments").select("batch_id").eq("id", assessment_id).execute()
    if not current_assessment_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment not found"
        )
    batch_id = current_assessment_res.data[0].get("batch_id")
    if batch_id:
        batch_res = db.table("batches").select("*").eq("id", batch_id).execute()
        if batch_res.data:
            from app.routers.batch import sync_batch_status
            batch = sync_batch_status(db, batch_res.data[0])
            if batch.get("status") == "CLOSED":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot update assessment for a CLOSED batch."
                )
    
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
        
        ret_val = AssessmentResponse(**row_to_api(result.data[0]))
        
        # Sync updated score to matching report card
        row = result.data[0]
        from app.services.assessment_sync_service import AssessmentSyncService
        AssessmentSyncService.sync_assessment_to_report_card(
            db,
            row.get("batch_id"),
            row.get("candidate_id"),
            row.get("assessment_name"),
            row.get("obtained_score"),
            row.get("total_score")
        )

        # Log ASSESSMENT_UPLOAD if graded/updated by Trainer
        if current_user.get("role") == "TRAINER":
            try:
                updated_row = result.data[0]
                batch_id = updated_row.get("batch_id")
                assessment_name = updated_row.get("assessment_name", "Assessment")
                if batch_id:
                    batch_res = db.table("batches").select("batch_name").eq("id", batch_id).execute()
                    batch_name = batch_res.data[0]["batch_name"] if batch_res.data else "Unknown"
                    db.table("notifications").insert({
                        "type": "ASSESSMENT_UPLOAD",
                        "message": f"Trainer {current_user.get('fullName', 'Trainer')} graded/updated assessment '{assessment_name}' for Batch '{batch_name}'.",
                        "is_read": False,
                        "created_at": datetime.utcnow().isoformat()
                    }).execute()
            except Exception as notif_err:
                print(f"[Warn] Failed to create ASSESSMENT_UPLOAD notification: {notif_err}")

        return ret_val
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
    check_batch_access(db, current_user, batch_id)
    
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

@router.post("/{batch_id}/generate-questions", response_model=BatchResponse)
async def generate_assessment_questions(
    batch_id: str,
    current_user: dict = Depends(has_role("ADMIN", "COORDINATOR", "TRAINER"))
):
    """Generate assessment questions for a batch using Gemini 2.5 Flash via Langchain"""
    from app.core.config import settings
    from langchain_google_genai import ChatGoogleGenerativeAI
    import json
    
    db = get_db()
    check_batch_access(db, current_user, batch_id)
    
    # 1. Fetch batch
    try:
        result = db.table("batches").select("*").eq("id", batch_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Batch not found")
        batch_row = result.data[0]
        
        from app.routers.batch import sync_batch_status
        batch_row = sync_batch_status(db, batch_row)
        if batch_row.get("status") == "CLOSED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot generate assessment questions for a CLOSED batch."
            )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")
        
    api_batch = row_to_api(batch_row)
    topics = api_batch.get("topics", [])
    
    # 2. Check curriculum topics
    if not topics:
        raise HTTPException(
            status_code=400, 
            detail="This batch has no curriculum topics defined. Please configure the curriculum topics and subtopics first."
        )
        
    # 3. Check Gemini API key
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your_gemini_api_key_here" or settings.GEMINI_API_KEY.strip() == "":
        raise HTTPException(
            status_code=400,
            detail="Gemini API Key is not configured. Please add GEMINI_API_KEY to your .env file."
        )
        
    # 4. Determine expected assessments based on category
    category_upper = str(api_batch.get("category", "SPARK")).upper()
    if "FOUNDATION" in category_upper:
        assessments_to_generate = ["GA1", "GA2", "GA3", "GA4", "GA5"]
    elif "STREAM" in category_upper:
        assessments_to_generate = [f"MCQ {i}" for i in range(1, 8)]
    else:  # SPARK phase 1 & 2
        assessments_to_generate = [
            "Communication Skills",
            "Interpersonal Skills",
            "Business Etiquette",
            "Service Orientation",
            "Emotional Intelligence & Empathy",
            "Accountability & Ownership",
            "Presentation Skills"
        ]
        
    formatted_curriculum = "\n".join([f"- {t}" for t in topics])
    formatted_assessments = ", ".join(assessments_to_generate)
    
    prompt = f"""You are a senior technical instructor and curriculum assessor. Your task is to generate assessment assessment questions for the course batch: {api_batch.get("batchName")}.
   
    You MUST generate exactly 3 challenging multiple-choice questions (MCQs) for each of the following required assessment names:
    {formatted_assessments}
    
    To ensure the questions are highly relevant, align them with the following course curriculum topics:
    {formatted_curriculum}
   
    Requirements:
    1. Generate exactly one MCQTopicGroup for each required assessment name.
    2. The 'topic' field in the output MUST exactly match the required assessment name (e.g. "GA1", "Assessment 1", "MCQ 1", etc.) character-for-character.
    3. Each question must have exactly 4 choices (options) and exactly 1 correctAnswer.
    4. The 'correctAnswer' field MUST match one of the string options in the 'options' list exactly.
    """
    
    # 5. Call Gemini via Langchain
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.2
        )
        
        structured_llm = llm.with_structured_output(AssessmentQuestionsSchema)
        response = await structured_llm.ainvoke(prompt)
        
        # Format the structured output to match the database expected structure
        generated_questions = []
        for i, topic_group in enumerate(response.topics):
            # Enforce expected name matching by index or name
            expected_name = assessments_to_generate[i] if i < len(assessments_to_generate) else topic_group.topic
            matched_name = expected_name
            for name in assessments_to_generate:
                if name.lower().replace(" ", "") == topic_group.topic.lower().replace(" ", ""):
                    matched_name = name
                    break
                    
            group_dict = {
                "topic": matched_name,
                "questions": [
                    {
                        "question": q.question,
                        "options": q.options,
                        "correctAnswer": q.correctAnswer
                    }
                    for q in topic_group.questions
                ]
            }
            generated_questions.append(group_dict)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")
        
    # 6. Update database record
    desc_str = batch_row.get("description")
    existing_desc_json = {}
    if desc_str:
        try:
            existing_desc_json = json.loads(desc_str)
            if not isinstance(existing_desc_json, dict):
                existing_desc_json = {"text": desc_str}
        except Exception:
            existing_desc_json = {"text": desc_str}
            
    existing_desc_json["questions"] = generated_questions
    
    update_data = {
        "description": json.dumps(existing_desc_json)
    }
    
    try:
        update_result = db.table("batches").update(update_data).eq("id", batch_id).execute()
        if not update_result.data:
            raise HTTPException(status_code=500, detail="Failed to update batch details in the database.")
            
        return BatchResponse(**row_to_api(update_result.data[0]))
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=400, detail=f"Database update error: {str(e)}")

@router.get("/batch/{batch_id}/available", response_model=List[str])
async def get_available_assessment_names(
    batch_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get the list of valid assessment names for the batch based on its category"""
    db = get_db()
    check_batch_access(db, current_user, batch_id)
    
    # 1. Fetch batch
    batch_res = db.table("batches").select("category", "phase").eq("id", batch_id).execute()
    if not batch_res.data:
        raise HTTPException(status_code=404, detail="Batch not found")
        
    batch = batch_res.data[0]
    category = batch.get("category", "SPARK")
    
    names = []
    if category == "SPARK":
        names = [
            "Communication Skills",
            "Interpersonal Skills",
            "Business Etiquette",
            "Service Orientation",
            "Emotional Intelligence & Empathy",
            "Accountability & Ownership",
            "Presentation Skills"
        ]
    elif category == "FOUNDATIONAL":
        for i in range(1, 6):
            names.append(f"GA{i} - Attempt 1")
            names.append(f"GA{i} - Attempt 2")
        names.extend([
            "Project Evaluation - Attempt 1", "Project Evaluation - Attempt 2",
            "Final Grade - Attempt 1", "Final Grade - Attempt 2"
        ])
    elif category == "STREAM":
        for i in range(1, 8):
            names.append(f"MCQ {i} - Attempt 1")
            names.append(f"MCQ {i} - Attempt 2")
        for i in range(1, 8):
            names.append(f"Coding {i} - Attempt 1")
            names.append(f"Coding {i} - Attempt 2")
        for i in range(1, 3):
            names.append(f"Project {i} - Attempt 1")
            names.append(f"Project {i} - Attempt 2")
        names.extend(["Online Coding - Attempt 1", "Online Coding - Attempt 2"])
        
    return names
