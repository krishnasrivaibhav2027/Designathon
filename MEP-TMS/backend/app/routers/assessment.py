from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from datetime import datetime
from app.schemas.schemas import (
    AssessmentCreate, AssessmentUpdate, AssessmentResponse,
    BatchReportResponse, BatchResponse
)
from app.core.database import get_db
from app.core.security import get_current_user, has_role
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
        
        ret_val = AssessmentResponse(**row_to_api(result.data[0]))

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
    
    # 1. Fetch batch
    try:
        result = db.table("batches").select("*").eq("id", batch_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Batch not found")
        batch_row = result.data[0]
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
        
    # 4. Format prompt
    formatted_curriculum = "\n".join([f"- {t}" for t in topics])
    prompt = f"""You are a senior technical instructor and curriculum assessor. Your task is to generate assessment questions for the course batch curriculum details below.
   
    Curriculum Topics and Subtopics:
    {formatted_curriculum}
   
    For each topic listed in the curriculum, generate exactly 3 challenging multiple-choice questions (MCQs) that cover its subtopics.
    Each question must have exactly 4 choices (options) and exactly 1 correctAnswer.
    
    CRITICAL: The 'correctAnswer' field MUST match one of the string options in the 'options' list exactly (character-for-character, case-sensitive).
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
        for topic_group in response.topics:
            group_dict = {
                "topic": topic_group.topic,
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
