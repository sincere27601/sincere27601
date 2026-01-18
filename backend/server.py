from fastapi import FastAPI, APIRouter, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import aiofiles
import tempfile
from emergentintegrations.llm.openai import OpenAISpeechToText
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Uploads directory
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Models
class Meeting(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = ""
    transcript: Optional[str] = ""
    summary: Optional[str] = ""
    action_items: Optional[List[str]] = []
    key_decisions: Optional[List[str]] = []
    attendees: Optional[List[str]] = []
    topics: Optional[List[str]] = []
    duration_seconds: Optional[int] = 0
    audio_filename: Optional[str] = ""
    status: str = "pending"  # pending, transcribing, summarizing, completed, error
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MeetingCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    attendees: Optional[List[str]] = []


class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    attendees: Optional[List[str]] = None


class TranscribeResponse(BaseModel):
    transcript: str
    meeting_id: str


class SummaryResponse(BaseModel):
    summary: str
    action_items: List[str]
    key_decisions: List[str]
    topics: List[str]
    meeting_id: str


class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


# Helper function to serialize meeting for response
def serialize_meeting(meeting: dict) -> dict:
    if '_id' in meeting:
        del meeting['_id']
    if 'created_at' in meeting and isinstance(meeting['created_at'], str):
        meeting['created_at'] = datetime.fromisoformat(meeting['created_at'].replace('Z', '+00:00'))
    if 'updated_at' in meeting and isinstance(meeting['updated_at'], str):
        meeting['updated_at'] = datetime.fromisoformat(meeting['updated_at'].replace('Z', '+00:00'))
    return meeting


# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "Meeting Summary AI API"}


# Meeting CRUD endpoints
@api_router.post("/meetings", response_model=Meeting)
async def create_meeting(meeting_data: MeetingCreate):
    meeting = Meeting(
        title=meeting_data.title,
        description=meeting_data.description,
        attendees=meeting_data.attendees
    )
    
    doc = meeting.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.meetings.insert_one(doc)
    return meeting


@api_router.get("/meetings", response_model=List[Meeting])
async def get_meetings(search: Optional[str] = None, limit: int = 50):
    query = {}
    if search:
        query = {
            "$or": [
                {"title": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}},
                {"transcript": {"$regex": search, "$options": "i"}}
            ]
        }
    
    meetings = await db.meetings.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    for meeting in meetings:
        serialize_meeting(meeting)
    
    return meetings


@api_router.get("/meetings/{meeting_id}", response_model=Meeting)
async def get_meeting(meeting_id: str):
    meeting = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    return serialize_meeting(meeting)


@api_router.put("/meetings/{meeting_id}", response_model=Meeting)
async def update_meeting(meeting_id: str, meeting_data: MeetingUpdate):
    existing = await db.meetings.find_one({"id": meeting_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    update_data = {k: v for k, v in meeting_data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.meetings.update_one({"id": meeting_id}, {"$set": update_data})
    
    updated = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    return serialize_meeting(updated)


@api_router.delete("/meetings/{meeting_id}")
async def delete_meeting(meeting_id: str):
    result = await db.meetings.delete_one({"id": meeting_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {"message": "Meeting deleted successfully"}


# Upload audio and transcribe
@api_router.post("/meetings/{meeting_id}/upload")
async def upload_audio(meeting_id: str, file: UploadFile = File(...)):
    meeting = await db.meetings.find_one({"id": meeting_id})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Validate file type
    allowed_types = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/webm", "audio/mp4", "audio/m4a", "video/webm", "video/mp4"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"File type not supported. Allowed: {allowed_types}")
    
    # Save file
    filename = f"{meeting_id}_{file.filename}"
    filepath = UPLOADS_DIR / filename
    
    async with aiofiles.open(filepath, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # Update meeting with filename
    await db.meetings.update_one(
        {"id": meeting_id},
        {"$set": {"audio_filename": filename, "status": "uploaded", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Audio uploaded successfully", "filename": filename}


# Transcribe meeting audio
@api_router.post("/meetings/{meeting_id}/transcribe", response_model=TranscribeResponse)
async def transcribe_meeting(meeting_id: str):
    meeting = await db.meetings.find_one({"id": meeting_id})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if not meeting.get('audio_filename'):
        raise HTTPException(status_code=400, detail="No audio file uploaded for this meeting")
    
    filepath = UPLOADS_DIR / meeting['audio_filename']
    if not filepath.exists():
        raise HTTPException(status_code=400, detail="Audio file not found")
    
    # Update status
    await db.meetings.update_one(
        {"id": meeting_id},
        {"$set": {"status": "transcribing", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        stt = OpenAISpeechToText(api_key=api_key)
        
        with open(filepath, "rb") as audio_file:
            response = await stt.transcribe(
                file=audio_file,
                model="whisper-1",
                response_format="json",
                language="en"
            )
        
        transcript = response.text
        
        # Update meeting with transcript
        await db.meetings.update_one(
            {"id": meeting_id},
            {"$set": {"transcript": transcript, "status": "transcribed", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return TranscribeResponse(transcript=transcript, meeting_id=meeting_id)
        
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        await db.meetings.update_one(
            {"id": meeting_id},
            {"$set": {"status": "error", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


# Generate summary from transcript
@api_router.post("/meetings/{meeting_id}/summarize", response_model=SummaryResponse)
async def summarize_meeting(meeting_id: str):
    meeting = await db.meetings.find_one({"id": meeting_id})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if not meeting.get('transcript'):
        raise HTTPException(status_code=400, detail="No transcript available for this meeting")
    
    # Update status
    await db.meetings.update_one(
        {"id": meeting_id},
        {"$set": {"status": "summarizing", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        chat = LlmChat(
            api_key=api_key,
            session_id=f"summary_{meeting_id}",
            system_message="""You are an expert meeting summarizer for business professionals. 
            Analyze the meeting transcript and provide a structured summary.
            
            Return your response in EXACTLY this JSON format:
            {
                "summary": "A comprehensive 2-3 paragraph summary of the meeting covering all main points discussed",
                "action_items": ["Action item 1", "Action item 2", ...],
                "key_decisions": ["Decision 1", "Decision 2", ...],
                "topics": ["Topic 1", "Topic 2", ...]
            }
            
            Be thorough and professional. Extract ALL action items, decisions, and topics mentioned."""
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(
            text=f"""Please analyze this meeting transcript and provide a business summary:

TRANSCRIPT:
{meeting['transcript']}

Remember to respond ONLY with the JSON format specified."""
        )
        
        response = await chat.send_message(user_message)
        
        # Parse the response
        import json
        # Try to extract JSON from the response
        response_text = response.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        try:
            summary_data = json.loads(response_text.strip())
        except json.JSONDecodeError:
            # Fallback: use the response as summary
            summary_data = {
                "summary": response,
                "action_items": [],
                "key_decisions": [],
                "topics": []
            }
        
        # Update meeting with summary data
        await db.meetings.update_one(
            {"id": meeting_id},
            {"$set": {
                "summary": summary_data.get("summary", ""),
                "action_items": summary_data.get("action_items", []),
                "key_decisions": summary_data.get("key_decisions", []),
                "topics": summary_data.get("topics", []),
                "status": "completed",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return SummaryResponse(
            summary=summary_data.get("summary", ""),
            action_items=summary_data.get("action_items", []),
            key_decisions=summary_data.get("key_decisions", []),
            topics=summary_data.get("topics", []),
            meeting_id=meeting_id
        )
        
    except Exception as e:
        logger.error(f"Summarization error: {str(e)}")
        await db.meetings.update_one(
            {"id": meeting_id},
            {"$set": {"status": "error", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")


# Upload, transcribe, and summarize in one go
@api_router.post("/meetings/process")
async def process_meeting(
    title: str = Form(...),
    description: str = Form(""),
    file: UploadFile = File(...)
):
    # Create meeting
    meeting = Meeting(
        title=title,
        description=description,
        status="processing"
    )
    
    doc = meeting.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.meetings.insert_one(doc)
    meeting_id = meeting.id
    
    # Save file
    filename = f"{meeting_id}_{file.filename}"
    filepath = UPLOADS_DIR / filename
    
    async with aiofiles.open(filepath, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    await db.meetings.update_one(
        {"id": meeting_id},
        {"$set": {"audio_filename": filename}}
    )
    
    try:
        # Transcribe
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        stt = OpenAISpeechToText(api_key=api_key)
        
        with open(filepath, "rb") as audio_file:
            response = await stt.transcribe(
                file=audio_file,
                model="whisper-1",
                response_format="json",
                language="en"
            )
        
        transcript = response.text
        
        await db.meetings.update_one(
            {"id": meeting_id},
            {"$set": {"transcript": transcript, "status": "transcribed"}}
        )
        
        # Summarize
        chat = LlmChat(
            api_key=api_key,
            session_id=f"summary_{meeting_id}",
            system_message="""You are an expert meeting summarizer for business professionals. 
            Analyze the meeting transcript and provide a structured summary.
            
            Return your response in EXACTLY this JSON format:
            {
                "summary": "A comprehensive 2-3 paragraph summary of the meeting covering all main points discussed",
                "action_items": ["Action item 1", "Action item 2", ...],
                "key_decisions": ["Decision 1", "Decision 2", ...],
                "topics": ["Topic 1", "Topic 2", ...]
            }
            
            Be thorough and professional. Extract ALL action items, decisions, and topics mentioned."""
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(
            text=f"""Please analyze this meeting transcript and provide a business summary:

TRANSCRIPT:
{transcript}

Remember to respond ONLY with the JSON format specified."""
        )
        
        response = await chat.send_message(user_message)
        
        import json
        response_text = response.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        try:
            summary_data = json.loads(response_text.strip())
        except json.JSONDecodeError:
            summary_data = {
                "summary": response,
                "action_items": [],
                "key_decisions": [],
                "topics": []
            }
        
        # Update meeting
        await db.meetings.update_one(
            {"id": meeting_id},
            {"$set": {
                "summary": summary_data.get("summary", ""),
                "action_items": summary_data.get("action_items", []),
                "key_decisions": summary_data.get("key_decisions", []),
                "topics": summary_data.get("topics", []),
                "status": "completed",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        final = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
        return serialize_meeting(final)
        
    except Exception as e:
        logger.error(f"Processing error: {str(e)}")
        await db.meetings.update_one(
            {"id": meeting_id},
            {"$set": {"status": "error", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


# Dashboard stats
@api_router.get("/stats")
async def get_stats():
    total_meetings = await db.meetings.count_documents({})
    completed_meetings = await db.meetings.count_documents({"status": "completed"})
    pending_meetings = await db.meetings.count_documents({"status": {"$in": ["pending", "processing", "uploaded", "transcribed", "transcribing", "summarizing"]}})
    
    return {
        "total_meetings": total_meetings,
        "completed_meetings": completed_meetings,
        "pending_meetings": pending_meetings
    }


# Status check endpoints (keep existing)
@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
