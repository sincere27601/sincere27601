from fastapi import FastAPI, APIRouter, File, UploadFile, HTTPException, Form, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone
import aiofiles
from emergentintegrations.llm.openai import OpenAISpeechToText
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

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

# Subscription Plans - Fixed packages (never accept amounts from frontend)
SUBSCRIPTION_PLANS = {
    "monthly": {
        "id": "monthly",
        "name": "Monthly Plan",
        "price": 9.99,
        "interval": "month",
        "description": "Unlimited meetings, transcriptions & summaries"
    },
    "yearly": {
        "id": "yearly",
        "name": "Yearly Plan",
        "price": 79.99,
        "interval": "year",
        "description": "Unlimited meetings, transcriptions & summaries (Save $40!)"
    }
}


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
    status: str = "pending"
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


class SubscriptionCheckoutRequest(BaseModel):
    plan_id: str
    origin_url: str


class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    plan_id: str
    plan_name: str
    amount: float
    currency: str = "usd"
    payment_status: str = "pending"
    status: str = "initiated"
    metadata: Optional[Dict[str, str]] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


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


# ============== SUBSCRIPTION ENDPOINTS ==============

@api_router.get("/subscription/plans")
async def get_subscription_plans():
    """Get all available subscription plans"""
    return {"plans": list(SUBSCRIPTION_PLANS.values())}


@api_router.post("/subscription/checkout")
async def create_subscription_checkout(request: Request, checkout_request: SubscriptionCheckoutRequest):
    """Create a Stripe checkout session for subscription"""
    
    # Validate plan
    if checkout_request.plan_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid subscription plan")
    
    plan = SUBSCRIPTION_PLANS[checkout_request.plan_id]
    
    # Get Stripe API key
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    # Build URLs from provided origin
    origin_url = checkout_request.origin_url.rstrip('/')
    success_url = f"{origin_url}/app/subscription/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/app/subscription"
    
    # Initialize Stripe
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    try:
        # Create checkout session with fixed amount from backend
        checkout_req = CheckoutSessionRequest(
            amount=float(plan["price"]),
            currency="usd",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "plan_id": plan["id"],
                "plan_name": plan["name"],
                "interval": plan["interval"]
            }
        )
        
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_req)
        
        # Create payment transaction record BEFORE redirect
        transaction = PaymentTransaction(
            session_id=session.session_id,
            plan_id=plan["id"],
            plan_name=plan["name"],
            amount=float(plan["price"]),
            currency="usd",
            payment_status="pending",
            status="initiated",
            metadata={
                "plan_id": plan["id"],
                "plan_name": plan["name"],
                "interval": plan["interval"]
            }
        )
        
        doc = transaction.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        
        await db.payment_transactions.insert_one(doc)
        
        return {
            "checkout_url": session.url,
            "session_id": session.session_id
        }
        
    except Exception as e:
        logger.error(f"Stripe checkout error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create checkout session: {str(e)}")


@api_router.get("/subscription/status/{session_id}")
async def get_subscription_status(request: Request, session_id: str):
    """Check the status of a subscription payment"""
    
    # Check if already processed
    existing = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    
    if existing and existing.get("payment_status") == "paid":
        return {
            "status": "complete",
            "payment_status": "paid",
            "plan_id": existing.get("plan_id"),
            "plan_name": existing.get("plan_name"),
            "amount": existing.get("amount")
        }
    
    # Get Stripe API key
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    # Initialize Stripe
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    try:
        checkout_status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction in database
        update_data = {
            "status": checkout_status.status,
            "payment_status": checkout_status.payment_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": update_data}
        )
        
        # Get updated transaction
        transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        
        return {
            "status": checkout_status.status,
            "payment_status": checkout_status.payment_status,
            "amount": checkout_status.amount_total / 100 if checkout_status.amount_total else 0,
            "currency": checkout_status.currency,
            "plan_id": transaction.get("plan_id") if transaction else None,
            "plan_name": transaction.get("plan_name") if transaction else None
        }
        
    except Exception as e:
        logger.error(f"Status check error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to check payment status: {str(e)}")


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    try:
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response:
            # Update payment transaction
            await db.payment_transactions.update_one(
                {"session_id": webhook_response.session_id},
                {"$set": {
                    "status": webhook_response.event_type,
                    "payment_status": webhook_response.payment_status,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}


@api_router.get("/subscription/transactions")
async def get_payment_transactions(limit: int = 50):
    """Get payment transaction history"""
    transactions = await db.payment_transactions.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"transactions": transactions}


# ============== MEETING ENDPOINTS ==============

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


@api_router.post("/meetings/{meeting_id}/upload")
async def upload_audio(meeting_id: str, file: UploadFile = File(...)):
    meeting = await db.meetings.find_one({"id": meeting_id})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    allowed_types = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/webm", "audio/mp4", "audio/m4a", "video/webm", "video/mp4"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"File type not supported. Allowed: {allowed_types}")
    
    filename = f"{meeting_id}_{file.filename}"
    filepath = UPLOADS_DIR / filename
    
    async with aiofiles.open(filepath, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    await db.meetings.update_one(
        {"id": meeting_id},
        {"$set": {"audio_filename": filename, "status": "uploaded", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Audio uploaded successfully", "filename": filename}


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


@api_router.post("/meetings/{meeting_id}/summarize", response_model=SummaryResponse)
async def summarize_meeting(meeting_id: str):
    meeting = await db.meetings.find_one({"id": meeting_id})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if not meeting.get('transcript'):
        raise HTTPException(status_code=400, detail="No transcript available for this meeting")
    
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


@api_router.post("/meetings/process")
async def process_meeting(
    title: str = Form(...),
    description: str = Form(""),
    file: UploadFile = File(...)
):
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
