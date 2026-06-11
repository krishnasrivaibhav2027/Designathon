from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks
from typing import List, Optional, TypedDict
from app.core.database import get_db
from app.core.security import get_current_user, has_role
from app.models.models import Batch, row_to_api
from app.schemas.schemas import BatchResponse
from pydantic import BaseModel, Field
import json
import asyncio
from datetime import datetime

router = APIRouter(prefix="/api/agent", tags=["agent"])

# ============ Schemas ============
class AgentCreateRequest(BaseModel):
    agentName: str
    modelName: str
    temperature: float = 0.7
    promptInstruction: Optional[str] = None
    additionalInstruction: Optional[str] = None

class Slide(BaseModel):
    title: str = Field(description="The title of the slide (e.g. 'Lesson Objectives', 'Core Concepts', 'Code Examples', 'Key takeaways')")
    bullets: List[str] = Field(description="3 to 5 bullet points explaining this slide's core concepts. Code snippets can be formatted in markdown code blocks.")

class SubtopicSlides(BaseModel):
    slides: List[Slide] = Field(description="List of slides. MUST start with 'Lesson Objectives' and end with 'Key takeaways'. Must have 2-4 content slides in between.")

# ============ Helpers ============
def parse_batch_topics(topics_list: List[str]) -> List[dict]:
    parsed_topics = []
    for topic_str in topics_list:
        if ":" in topic_str:
            parts = topic_str.split(":", 1)
            topic_name = parts[0].strip()
            subtopics_str = parts[1]
            subtopics = [s.strip() for s in subtopics_str.split(",") if s.strip()]
            parsed_topics.append({
                "name": topic_name,
                "subtopics": subtopics
            })
        else:
            parsed_topics.append({
                "name": topic_str.strip(),
                "subtopics": ["General Concepts"]
            })
    return parsed_topics

# ============ Langgraph State & Workflow ============
class AgentState(TypedDict):
    batch_name: str
    topics: List[dict]
    model_name: str
    temperature: float
    prompt_instruction: Optional[str]
    additional_instruction: Optional[str]
    generated_content: List[dict]

async def generate_all_slides_node(state: AgentState):
    batch_name = state["batch_name"]
    model_name = state["model_name"]
    temperature = state["temperature"]
    prompt_instruction = state["prompt_instruction"]
    additional_instruction = state["additional_instruction"]
    topics = state["topics"]
    
    default_base_prompt = """You are an elite technical instructor and an expert in computer science pedagogy.
Your task is to generate highly educational, structured, and visually engaging training slides."""

    base_prompt = prompt_instruction.strip() if prompt_instruction and prompt_instruction.strip() else default_base_prompt
    additional_prompt = additional_instruction.strip() if additional_instruction and additional_instruction.strip() else ""

    from langchain_openai import ChatOpenAI
    from app.core.config import settings
    
    # Resolve the model name, falling back to the configured deployment name if old gemini selection is present
    resolved_model = settings.AZURE_OPENAI_DEPLOYMENT
    if model_name and not model_name.startswith("gemini"):
        resolved_model = model_name

    # Initialize the Azure OpenAI model via Langchain
    llm = ChatOpenAI(
        model=resolved_model,
        api_key=settings.AZURE_OPENAI_API_KEY,
        base_url=settings.AZURE_OPENAI_ENDPOINT,
        temperature=temperature
    )
    
    # Enforce structured output matching the Slide models list
    structured_llm = llm.with_structured_output(SubtopicSlides)
    
    # Concurrency limit to avoid API rate limits
    sem = asyncio.Semaphore(5)
    
    async def generate_single_subtopic(topic_name: str, subtopic_name: str):
        async with sem:
            prompt = f"""{base_prompt}
            
            Batch Context: {batch_name}
            Topic Group: {topic_name}
            Subtopic: {subtopic_name}
            
            {f"Additional instructions: {additional_prompt}" if additional_prompt else ""}
            
            Slide Structure Requirements:
            - SLIDE 1 (Must be titled exactly "Lesson Objectives"): Outline the specific learning outcomes for this subtopic in 3-5 concise bullets.
            - SLIDES 2 to N (Content Slides, 2-4 slides): Break down the concept step-by-step. Provide deep-dive explanations, conceptual diagrams described in text, or clean code snippets in markdown format (using code blocks). IMPORTANT: Always put code blocks on separate lines and include newlines inside the code block so it is readable and properly formatted, rather than compressing it to a single line.
            - FINAL SLIDE (Must be titled exactly "Key takeaways"): Highlight the 3-5 critical takeaways from this subtopic.
            """
            
            try:
                result = await structured_llm.ainvoke(prompt)
                slides_list = []
                for s in result.slides:
                    slides_list.append({
                        "title": s.title,
                        "bullets": s.bullets
                    })
                return {
                    "name": subtopic_name,
                    "slides": slides_list
                }
            except Exception as e:
                print(f"[Error] AI generation failed for subtopic '{subtopic_name}': {e}")
                # Fallback to avoid complete failure
                return {
                    "name": subtopic_name,
                    "slides": [
                        {
                            "title": "Lesson Objectives",
                            "bullets": [f"Understand {subtopic_name}", "Learn core concepts of this subtopic"]
                        },
                        {
                            "title": "Core Concepts",
                            "bullets": ["Due to an AI service rate limit or interruption, content generation was skipped.", "Please trigger re-generation of the agent to fetch slides."]
                        },
                        {
                            "title": "Key takeaways",
                            "bullets": [f"Review {subtopic_name} documentation", "Experiment with code locally"]
                        }
                    ]
                }
                
    async def process_topic(topic_item: dict):
        topic_name = topic_item["name"]
        subtopic_names = topic_item["subtopics"]
        
        # Parallel generation of all subtopics in this topic group
        tasks = [generate_single_subtopic(topic_name, sub) for sub in subtopic_names]
        subtopic_contents = await asyncio.gather(*tasks)
        
        return {
            "topic": topic_name,
            "subtopics": subtopic_contents
        }

    # Parallel generation across all topic groups
    topic_tasks = [process_topic(t) for t in topics]
    generated_content = await asyncio.gather(*topic_tasks)
    
    return {"generated_content": generated_content}

# Compile Langgraph Workflow Graph
from langgraph.graph import StateGraph, START, END

workflow = StateGraph(AgentState)
workflow.add_node("generate_content", generate_all_slides_node)
workflow.add_edge(START, "generate_content")
workflow.add_edge("generate_content", END)
graph = workflow.compile()

async def bg_generate_slides(batch_id: str, initial_state: dict, batch_name: str):
    # This runs in background
    try:
        from app.core.database import get_db
        db = get_db()
        
        # 1. Run Langgraph Workflow
        output = await graph.ainvoke(initial_state)
        generated_slides = output.get("generated_content", [])
        
        # 2. Fetch latest batch row
        batch_result = db.table("batches").select("*").eq("id", batch_id).execute()
        if not batch_result.data:
            return
            
        batch_row = batch_result.data[0]
        desc_str = batch_row.get("description")
        desc_json = {}
        if desc_str:
            try:
                desc_json = json.loads(desc_str)
            except Exception:
                desc_json = {"text": desc_str}
                
        # 3. Update agent content and status
        if "agent" in desc_json:
            desc_json["agent"]["content"] = generated_slides
            desc_json["agent"]["status"] = "ready"
            
            updated_desc_str = json.dumps(desc_json)
            
            # 4. Save to DB
            db.table("batches").update({
                "description": updated_desc_str,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", batch_id).execute()
            
            # 5. Insert notification
            try:
                db.table("notifications").insert({
                    "type": "SETTING_CHANGE",
                    "message": f"AI Teaching Agent '{desc_json['agent'].get('agentName', 'AI Assistant')}' is ready for batch '{batch_name}'!",
                    "is_read": False,
                    "created_at": datetime.utcnow().isoformat()
                }).execute()
            except Exception as e:
                print(f"[Warn] Notification error in background task: {e}")
                
    except Exception as e:
        print(f"[Error] Background slides generation failed for batch {batch_id}: {e}")
        # Mark as failed in DB
        try:
            from app.core.database import get_db
            db = get_db()
            batch_result = db.table("batches").select("*").eq("id", batch_id).execute()
            if batch_result.data:
                batch_row = batch_result.data[0]
                desc_str = batch_row.get("description")
                if desc_str:
                    desc_json = json.loads(desc_str)
                    if "agent" in desc_json:
                        desc_json["agent"]["status"] = "failed"
                        db.table("batches").update({
                            "description": json.dumps(desc_json),
                            "updated_at": datetime.utcnow().isoformat()
                        }).eq("id", batch_id).execute()
        except Exception as db_err:
            print(f"[Error] Failed to mark status as failed: {db_err}")

# ============ Routes ============
@router.post("/create/{batch_id}", response_model=BatchResponse)
async def create_agent(
    batch_id: str,
    req: AgentCreateRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(has_role("ADMIN", "COORDINATOR", "TRAINER"))
):
    """Create or update the AI Teaching Agent for a batch"""
    from app.core.config import settings
    db = get_db()
    
    # 1. Fetch batch
    batch_result = db.table("batches").select("*").eq("id", batch_id).execute()
    if not batch_result.data:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    batch_row = batch_result.data[0]
    
    # 2. Resolve user's actual full name from database
    user_name = "Trainer"
    user_res = db.table("users").select("full_name").eq("id", current_user.get("sub")).execute()
    if user_res.data:
        user_name = user_res.data[0].get("full_name", "")

    # Check permissions if current user is trainer
    if current_user.get("role") == "TRAINER":
        trainers_list = batch_row.get("trainers", []) or []
        trainers_lower = [t.lower() for t in trainers_list]
        if not user_name or user_name.lower() not in trainers_lower:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only manage agents for cohorts assigned to you."
            )

    # 3. Check Azure AI Services API key
    if not settings.AZURE_OPENAI_API_KEY or settings.AZURE_OPENAI_API_KEY.strip() == "":
        raise HTTPException(
            status_code=400,
            detail="Azure AI Services API Key is not configured. Please add AZURE_OPENAI_API_KEY to your .env file."
        )

    # 4. Parse curriculum
    topics_list = batch_row.get("topics") or []
    if not topics_list:
        # Load topics from description JSON if topics is empty
        desc_str = batch_row.get("description")
        if desc_str:
            try:
                parsed = json.loads(desc_str)
                topics_list = parsed.get("topics", [])
            except Exception:
                pass
                
    if not topics_list:
        raise HTTPException(
            status_code=400,
            detail="Batch curriculum is empty. Please add topics to the batch before creating an agent."
        )

    parsed_topics = parse_batch_topics(topics_list)

    # 5. Embed Agent data in batch description JSON with 'preparing' status
    desc_str = batch_row.get("description")
    desc_json = {}
    if desc_str:
        try:
            desc_json = json.loads(desc_str)
        except Exception:
            desc_json = {"text": desc_str}
            
    # Structure Agent config and set status to preparing
    agent_data = {
        "agentName": req.agentName,
        "modelName": req.modelName,
        "temperature": req.temperature,
        "promptInstruction": req.promptInstruction,
        "additionalInstruction": req.additionalInstruction,
        "createdBy": user_name or "Trainer",
        "createdAt": datetime.utcnow().isoformat(),
        "status": "preparing",
        "content": []
    }
    
    desc_json["agent"] = agent_data
    updated_desc_str = json.dumps(desc_json)
    
    # 6. Update batch record in Supabase
    update_result = db.table("batches").update({
        "description": updated_desc_str,
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", batch_id).execute()
    
    if not update_result.data:
        raise HTTPException(status_code=500, detail="Failed to save agent to database")
        
    # Queue background task to run Langgraph content generation
    initial_state = {
        "batch_name": batch_row.get("batch_name", "Untitled Batch"),
        "topics": parsed_topics,
        "model_name": req.modelName,
        "temperature": req.temperature,
        "prompt_instruction": req.promptInstruction,
        "additional_instruction": req.additionalInstruction,
        "generated_content": []
    }
    background_tasks.add_task(
        bg_generate_slides, 
        batch_id=batch_id, 
        initial_state=initial_state, 
        batch_name=batch_row.get("batch_name", "Untitled Batch")
    )
    
    # Log AGENT_CREATED notification
    try:
        user_role_label = "Trainer" if current_user.get("role") == "TRAINER" else current_user.get("role", "User").title()
        db.table("notifications").insert({
            "type": "SETTING_CHANGE",
            "message": f"AI Teaching Agent '{req.agentName}' appointed for batch '{batch_row.get('batch_name')}' by {user_role_label} {user_name}.",
            "is_read": False,
            "created_at": datetime.utcnow().isoformat()
        }).execute()
    except Exception as notif_err:
        print(f"[Warn] Failed to create AGENT_CREATED notification: {notif_err}")
        
    return BatchResponse(**row_to_api(update_result.data[0]))

@router.delete("/{batch_id}", response_model=BatchResponse)
async def delete_agent(
    batch_id: str,
    current_user: dict = Depends(has_role("ADMIN", "COORDINATOR", "TRAINER"))
):
    """Remove AI Teaching Agent from a batch"""
    db = get_db()
    
    # 1. Fetch batch
    batch_result = db.table("batches").select("*").eq("id", batch_id).execute()
    if not batch_result.data:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    batch_row = batch_result.data[0]
    
    # 2. Resolve user's actual full name from database
    user_name = "Trainer"
    user_res = db.table("users").select("full_name").eq("id", current_user.get("sub")).execute()
    if user_res.data:
        user_name = user_res.data[0].get("full_name", "")

    # Check permissions if current user is trainer
    if current_user.get("role") == "TRAINER":
        trainers_list = batch_row.get("trainers", []) or []
        trainers_lower = [t.lower() for t in trainers_list]
        if not user_name or user_name.lower() not in trainers_lower:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only manage agents for cohorts assigned to you."
            )

    # 3. Modify description JSON
    desc_str = batch_row.get("description")
    desc_json = {}
    if desc_str:
        try:
            desc_json = json.loads(desc_str)
        except Exception:
            desc_json = {"text": desc_str}
            
    if "agent" in desc_json:
        del desc_json["agent"]
        
    updated_desc_str = json.dumps(desc_json)
    
    # 4. Update batch record in Supabase
    update_result = db.table("batches").update({
        "description": updated_desc_str,
        "updated_at": datetime.utcnow().isoformat()
    }).eq("id", batch_id).execute()
    
    if not update_result.data:
        raise HTTPException(status_code=500, detail="Failed to delete agent from database")
        
    return BatchResponse(**row_to_api(update_result.data[0]))
