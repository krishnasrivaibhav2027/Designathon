import os
import shutil
import uuid
from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File
from typing import List, Optional
from pydantic import BaseModel
from app.core.config import settings
from app.core.security import get_current_user, has_role
from app.mcp.client import run_coordinator_agent

router = APIRouter(prefix="/api/assistant", tags=["assistant"])

# ============ Schemas ============
class ChatMessage(BaseModel):
    role: str # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    prompt: str
    chat_history: Optional[List[ChatMessage]] = []

class ToolLogItem(BaseModel):
    toolName: str
    arguments: dict
    status: str
    result: Optional[str] = None
    timestamp: str

class ChatResponse(BaseModel):
    response: str
    thought_log: List[dict]

# ============ Routes ============

@router.post("/chat", response_model=ChatResponse)
async def assistant_chat(
    req: ChatRequest,
    current_user: dict = Depends(has_role("ADMIN", "COORDINATOR"))
):
    """
    Chat with the Coordinator's Assistant.
    Runs the agent reasoning loop utilizing custom MCP tools (Gmail, Database, Excel).
    """


    try:
        # Convert request history to raw list of dicts
        history = [{"role": msg.role, "content": msg.content} for msg in req.chat_history]
        
        # Execute the agent loop
        final_answer, thought_log = await run_coordinator_agent(req.prompt, current_user, history)
        
        return ChatResponse(
            response=final_answer,
            thought_log=thought_log
        )
    except Exception as e:
        print(f"[Error] Assistant Agent failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Assistant chat session failed: {str(e)}"
        )

@router.post("/upload")
async def upload_attachment(
    file: UploadFile = File(...),
    current_user: dict = Depends(has_role("ADMIN", "COORDINATOR"))
):
    """
    Upload an Excel spreadsheet or document for the assistant to process.
    Saves the file to the uploads directory and returns its absolute path on disk.
    """
    # Check extension
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".xlsx", ".xls", ".csv"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Only Excel (.xlsx, .xls) and CSV files are allowed."
        )

    # Ensure uploads folder exists
    upload_dir = os.path.abspath(settings.UPLOAD_FOLDER)
    os.makedirs(upload_dir, exist_ok=True)

    # Generate a unique filename to prevent name collisions
    unique_filename = f"{uuid.uuid4().hex}_{filename}"
    file_path = os.path.join(upload_dir, unique_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {
            "filename": filename,
            "filePath": file_path,
            "url": f"/uploads/{unique_filename}" # relative url
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
