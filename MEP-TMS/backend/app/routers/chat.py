from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, status, Depends
from typing import List, Optional, Dict
from datetime import datetime
from pydantic import BaseModel
import uuid
import json
import asyncio
from app.core.database import get_db
from app.core.security import get_current_user

router = APIRouter(prefix="/api/chat", tags=["chat"])

# ============ Schemas ============
class ThreadResponse(BaseModel):
    id: str
    title: str
    type: str # "CHANNEL" or "DM"
    created_at: str

class MessageResponse(BaseModel):
    id: str
    thread_id: str
    sender_email: str
    sender_name: str
    sender_role: str
    content: str
    created_at: str

class CreateThreadRequest(BaseModel):
    title: str
    type: str

# ============ DB Table Initializers ============
# Graceful local fallback lists if Supabase connection drops/tables not created yet
in_memory_threads = [
    {"id": "channel-staff-lounge", "title": "# Staff Lounge (Coordinators + Trainers)", "type": "CHANNEL", "created_at": datetime.utcnow().isoformat()},
    {"id": "channel-announcements", "title": "# General Announcements", "type": "CHANNEL", "created_at": datetime.utcnow().isoformat()}
]
in_memory_messages = {}

def get_supabase_threads(db):
    try:
        res = db.table("chat_threads").select("*").order("created_at", desc=False).execute()
        if res.data:
            return res.data
    except Exception:
        pass
    return in_memory_threads

def create_supabase_thread(db, title: str, thread_type: str):
    thread_id = str(uuid.uuid4())
    new_thread = {
        "id": thread_id,
        "title": title,
        "type": thread_type,
        "created_at": datetime.utcnow().isoformat()
    }
    try:
        res = db.table("chat_threads").insert(new_thread).execute()
        if res.data:
            return res.data[0]
    except Exception:
        pass
    in_memory_threads.append(new_thread)
    return new_thread

def get_supabase_messages(db, thread_id: str):
    try:
        res = db.table("chat_messages").select("*").eq("thread_id", thread_id).order("created_at", desc=False).execute()
        if res.data:
            return res.data
    except Exception:
        pass
    return in_memory_messages.get(thread_id, [])

def save_supabase_message(db, thread_id: str, sender_email: str, sender_name: str, sender_role: str, content: str):
    msg_id = str(uuid.uuid4())
    new_msg = {
        "id": msg_id,
        "thread_id": thread_id,
        "sender_email": sender_email,
        "sender_name": sender_name,
        "sender_role": sender_role,
        "content": content,
        "created_at": datetime.utcnow().isoformat()
    }
    try:
        res = db.table("chat_messages").insert(new_msg).execute()
        if res.data:
            return res.data[0]
    except Exception:
        pass
    
    if thread_id not in in_memory_messages:
        in_memory_messages[thread_id] = []
    in_memory_messages[thread_id].append(new_msg)
    return new_msg

# ============ REST Endpoints ============

@router.get("/threads", response_model=List[ThreadResponse])
async def get_threads(current_user: dict = Depends(get_current_user)):
    """Fetch all chat rooms/threads"""
    db = get_db()
    threads = get_supabase_threads(db)
    return [
        ThreadResponse(
            id=t["id"],
            title=t["title"],
            type=t.get("type", "CHANNEL"),
            created_at=t["created_at"]
        ) for t in threads
    ]

@router.post("/threads", response_model=ThreadResponse)
async def create_thread(req: CreateThreadRequest, current_user: dict = Depends(get_current_user)):
    """Create a new chat room/channel manually"""
    db = get_db()
    thread = create_supabase_thread(db, req.title, req.type)
    return ThreadResponse(
        id=thread["id"],
        title=thread["title"],
        type=thread.get("type", "CHANNEL"),
        created_at=thread["created_at"]
    )

@router.get("/threads/{thread_id}/messages", response_model=List[MessageResponse])
async def get_thread_messages(thread_id: str, current_user: dict = Depends(get_current_user)):
    """Get all messages for a specific chat room/channel"""
    db = get_db()
    messages = get_supabase_messages(db, thread_id)
    return [
        MessageResponse(
            id=m["id"],
            thread_id=m["thread_id"],
            sender_email=m.get("sender_email", "system@mep.com"),
            sender_name=m.get("sender_name", "System"),
            sender_role=m.get("sender_role", "COORDINATOR"),
            content=m["content"],
            created_at=m["created_at"]
        ) for m in messages
    ]

# ============ WebSocket Chat Pub-Sub Manager ============

class ConnectionManager:
    def __init__(self):
        # Map thread_id -> list of WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, thread_id: str, websocket: WebSocket):
        await websocket.accept()
        if thread_id not in self.active_connections:
            self.active_connections[thread_id] = []
        self.active_connections[thread_id].append(websocket)

    def disconnect(self, thread_id: str, websocket: WebSocket):
        if thread_id in self.active_connections:
            if websocket in self.active_connections[thread_id]:
                self.active_connections[thread_id].remove(websocket)

    async def broadcast(self, thread_id: str, message: dict):
        if thread_id in self.active_connections:
            for connection in self.active_connections[thread_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

manager = ConnectionManager()

@router.websocket("/ws/{thread_id}")
async def chat_websocket(websocket: WebSocket, thread_id: str):
    """Real-time Multi-user Messaging WebSocket Channel"""
    await manager.connect(thread_id, websocket)
    db = get_db()
    
    try:
        # Hello handshake
        await websocket.send_json({
            "type": "info",
            "message": f"Connected to chat room: {thread_id}"
        })
        
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            msg_type = message_data.get("type", "message")
            
            if msg_type == "typing":
                # Broadcast typing activity to other users in this room
                await manager.broadcast(thread_id, {
                    "type": "typing",
                    "sender_name": message_data.get("sender_name"),
                    "sender_email": message_data.get("sender_email")
                })
            
            elif msg_type == "message":
                content = message_data.get("content")
                sender_email = message_data.get("sender_email")
                sender_name = message_data.get("sender_name")
                sender_role = message_data.get("sender_role", "COORDINATOR")
                
                if not content or not sender_email:
                    continue

                # Save message in DB / memory
                saved_msg = save_supabase_message(
                    db=db,
                    thread_id=thread_id,
                    sender_email=sender_email,
                    sender_name=sender_name,
                    sender_role=sender_role,
                    content=content
                )
                
                # Broadcast actual message to everyone in the room
                await manager.broadcast(thread_id, {
                    "type": "message",
                    "message": {
                        "id": saved_msg["id"],
                        "thread_id": thread_id,
                        "sender_email": saved_msg["sender_email"],
                        "sender_name": saved_msg["sender_name"],
                        "sender_role": saved_msg["sender_role"],
                        "content": saved_msg["content"],
                        "created_at": saved_msg["created_at"]
                    }
                })

    except WebSocketDisconnect:
        manager.disconnect(thread_id, websocket)
    except Exception as e:
        manager.disconnect(thread_id, websocket)
        print(f"[WebSocket Error] {e}")
