from fastapi import FastAPI, APIRouter, File, UploadFile, HTTPException, Form, Request, Response, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import aiofiles
import httpx
import bcrypt
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

# Session expiry duration
SESSION_EXPIRY_DAYS = 7

# Valid referral codes for lifetime access
VALID_REFERRAL_CODES = {
    "Gillian": {"type": "lifetime", "description": "Lifetime free access"},
    "gillian": {"type": "lifetime", "description": "Lifetime free access"},
    "GILLIAN": {"type": "lifetime", "description": "Lifetime free access"},
}

# Subscription Plans
SUBSCRIPTION_PLANS = {
    "weekly": {
        "id": "weekly",
        "name": "Weekly Plan",
        "price": 7.00,
        "interval": "week",
        "description": "Billed weekly - cancel anytime",
        "trial_days": 3
    },
    "yearly": {
        "id": "yearly",
        "name": "Yearly Plan",
        "price": 78.00,
        "interval": "year",
        "description": "Best value - save over 40%!",
        "trial_days": 3
    }
}


# ============== MODELS ==============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    user_id: str = Field(default_factory=lambda: f"user_{uuid.uuid4().hex[:12]}")
    email: str
    name: str
    picture: Optional[str] = ""
    auth_provider: str = "email"  # "email" or "google"
    password_hash: Optional[str] = None
    subscription_status: str = "none"  # "none", "trial", "active", "lifetime", "expired"
    subscription_plan: Optional[str] = None  # "weekly", "yearly"
    subscription_expires_at: Optional[datetime] = None
    trial_expires_at: Optional[datetime] = None
    promo_code_used: Optional[str] = None
    referral_code: Optional[str] = None  # User's unique referral code
    referred_by: Optional[str] = None  # user_id of referrer
    referral_earnings: float = 0.0  # Total earnings from referrals
    stripe_customer_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Referral(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: f"ref_{uuid.uuid4().hex[:12]}")
    referrer_user_id: str  # Who referred
    referred_user_id: str  # Who was referred
    referred_email: str
    status: str = "pending"  # "pending", "qualified", "paid"
    reward_amount: float = 50.0
    qualified_at: Optional[datetime] = None  # When they subscribed to yearly
    paid_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    session_id: str = Field(default_factory=lambda: f"sess_{uuid.uuid4().hex}")
    user_id: str
    session_token: str = Field(default_factory=lambda: f"token_{uuid.uuid4().hex}")
    expires_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc) + timedelta(days=SESSION_EXPIRY_DAYS))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleSessionRequest(BaseModel):
    session_id: str


class Meeting(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Link meeting to user
    title: str
    description: Optional[str] = ""
    transcript: Optional[str] = ""
    summary: Optional[str] = ""
    executive_summary: Optional[str] = ""  # Short executive-level overview
    action_items: Optional[List[str]] = []
    key_decisions: Optional[List[str]] = []
    attendees: Optional[List[str]] = []
    topics: Optional[List[str]] = []
    duration_seconds: Optional[int] = 0
    audio_filename: Optional[str] = ""
    audio_url: Optional[str] = ""  # Cloud storage URL
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
    executive_summary: str
    action_items: List[str]
    key_decisions: List[str]
    topics: List[str]
    meeting_id: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    picture: Optional[str] = None


class PasswordReset(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: f"reset_{uuid.uuid4().hex[:16]}")
    user_id: str
    token: str = Field(default_factory=lambda: uuid.uuid4().hex)
    expires_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc) + timedelta(hours=1))
    used: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PromoCodeRequest(BaseModel):
    code: str


class SubscriptionCheckoutRequest(BaseModel):
    plan_id: str
    origin_url: str


class ReferralSignupRequest(BaseModel):
    referral_code: str


class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_id: str
    plan_id: str
    plan_name: str
    amount: float
    currency: str = "usd"
    is_trial: bool = False
    payment_status: str = "pending"
    status: str = "initiated"
    metadata: Optional[Dict[str, str]] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============== AUTH HELPERS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def generate_referral_code(user_id: str) -> str:
    """Generate a unique referral code for a user"""
    return f"REF{user_id[-6:].upper()}{uuid.uuid4().hex[:4].upper()}"


async def check_user_subscription(user_doc: dict) -> dict:
    """Check and update user subscription status"""
    status = user_doc.get("subscription_status", "none")
    
    # Lifetime access never expires
    if status == "lifetime":
        return {"has_access": True, "status": "lifetime", "message": "Lifetime access"}
    
    # Check trial
    if status == "trial":
        trial_expires = user_doc.get("trial_expires_at")
        if trial_expires:
            if isinstance(trial_expires, str):
                trial_expires = datetime.fromisoformat(trial_expires.replace('Z', '+00:00'))
            if trial_expires.tzinfo is None:
                trial_expires = trial_expires.replace(tzinfo=timezone.utc)
            if trial_expires > datetime.now(timezone.utc):
                return {"has_access": True, "status": "trial", "expires_at": trial_expires.isoformat()}
    
    # Check active subscription
    if status == "active":
        sub_expires = user_doc.get("subscription_expires_at")
        if sub_expires:
            if isinstance(sub_expires, str):
                sub_expires = datetime.fromisoformat(sub_expires.replace('Z', '+00:00'))
            if sub_expires.tzinfo is None:
                sub_expires = sub_expires.replace(tzinfo=timezone.utc)
            if sub_expires > datetime.now(timezone.utc):
                return {"has_access": True, "status": "active", "plan": user_doc.get("subscription_plan"), "expires_at": sub_expires.isoformat()}
    
    return {"has_access": False, "status": "none", "message": "No active subscription"}


async def get_current_user(request: Request) -> Optional[dict]:
    """Get current user from session token (cookie or header)"""
    # Try cookie first
    session_token = request.cookies.get("session_token")
    
    # Fallback to Authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header[7:]
    
    if not session_token:
        return None
    
    # Find session
    session_doc = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session_doc:
        return None
    
    # Check expiry
    expires_at = session_doc.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return None
    
    # Get user
    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0, "password_hash": 0})
    return user_doc


async def require_auth(request: Request) -> dict:
    """Dependency that requires authentication"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


# ============== AUTH ENDPOINTS ==============

class RegisterWithReferralRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    referral_code: Optional[str] = None


@api_router.post("/auth/register")
async def register(request: RegisterWithReferralRequest, response: Response):
    """Register with email and password, optionally with referral code"""
    # Check if email exists
    existing = await db.users.find_one({"email": request.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check referral code if provided
    referred_by = None
    if request.referral_code:
        referrer = await db.users.find_one({"referral_code": request.referral_code}, {"_id": 0})
        if referrer:
            referred_by = referrer["user_id"]
    
    # Create user with their own referral code
    user = User(
        email=request.email,
        name=request.name,
        auth_provider="email",
        password_hash=hash_password(request.password),
        referred_by=referred_by
    )
    
    # Generate unique referral code for this user
    user_referral_code = generate_referral_code(user.user_id)
    
    user_doc = user.model_dump()
    user_doc['referral_code'] = user_referral_code
    user_doc['created_at'] = user_doc['created_at'].isoformat()
    if user_doc.get('subscription_expires_at'):
        user_doc['subscription_expires_at'] = user_doc['subscription_expires_at'].isoformat()
    if user_doc.get('trial_expires_at'):
        user_doc['trial_expires_at'] = user_doc['trial_expires_at'].isoformat()
    await db.users.insert_one(user_doc)
    
    # Create referral record if referred
    if referred_by:
        referral = Referral(
            referrer_user_id=referred_by,
            referred_user_id=user.user_id,
            referred_email=request.email
        )
        ref_doc = referral.model_dump()
        ref_doc['created_at'] = ref_doc['created_at'].isoformat()
        if ref_doc.get('qualified_at'):
            ref_doc['qualified_at'] = ref_doc['qualified_at'].isoformat()
        if ref_doc.get('paid_at'):
            ref_doc['paid_at'] = ref_doc['paid_at'].isoformat()
        await db.referrals.insert_one(ref_doc)
    
    # Create session
    session = UserSession(user_id=user.user_id)
    session_doc = session.model_dump()
    session_doc['expires_at'] = session_doc['expires_at'].isoformat()
    session_doc['created_at'] = session_doc['created_at'].isoformat()
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session.session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=SESSION_EXPIRY_DAYS * 24 * 60 * 60
    )
    
    return {
        "user_id": user.user_id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "session_token": session.session_token
    }


@api_router.post("/auth/login")
async def login(request: LoginRequest, response: Response):
    """Login with email and password"""
    user_doc = await db.users.find_one({"email": request.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user_doc.get("password_hash"):
        raise HTTPException(status_code=401, detail="This account uses Google Sign-In")
    
    if not verify_password(request.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create session
    session = UserSession(user_id=user_doc["user_id"])
    session_doc = session.model_dump()
    session_doc['expires_at'] = session_doc['expires_at'].isoformat()
    session_doc['created_at'] = session_doc['created_at'].isoformat()
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session.session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=SESSION_EXPIRY_DAYS * 24 * 60 * 60
    )
    
    return {
        "user_id": user_doc["user_id"],
        "email": user_doc["email"],
        "name": user_doc["name"],
        "picture": user_doc.get("picture", ""),
        "session_token": session.session_token
    }


@api_router.post("/auth/google/session")
async def google_session(request: GoogleSessionRequest, response: Response):
    """Exchange Google session_id for user session"""
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": request.session_id}
            )
            
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            google_data = resp.json()
    except Exception as e:
        logger.error(f"Google auth error: {str(e)}")
        raise HTTPException(status_code=401, detail="Failed to verify Google session")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": google_data["email"]}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info if needed
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": google_data.get("name", existing_user.get("name")),
                "picture": google_data.get("picture", existing_user.get("picture"))
            }}
        )
    else:
        # Create new user
        user = User(
            email=google_data["email"],
            name=google_data.get("name", ""),
            picture=google_data.get("picture", ""),
            auth_provider="google"
        )
        user_doc = user.model_dump()
        user_doc['created_at'] = user_doc['created_at'].isoformat()
        await db.users.insert_one(user_doc)
        user_id = user.user_id
    
    # Create session
    session = UserSession(user_id=user_id)
    session_doc = session.model_dump()
    session_doc['expires_at'] = session_doc['expires_at'].isoformat()
    session_doc['created_at'] = session_doc['created_at'].isoformat()
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session.session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=SESSION_EXPIRY_DAYS * 24 * 60 * 60
    )
    
    # Get updated user
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    
    return {
        "user_id": user_doc["user_id"],
        "email": user_doc["email"],
        "name": user_doc["name"],
        "picture": user_doc.get("picture", ""),
        "session_token": session.session_token
    }


@api_router.get("/auth/me")
async def get_me(request: Request):
    """Get current authenticated user"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@api_router.put("/auth/profile")
async def update_profile(request: Request, profile_data: ProfileUpdateRequest):
    """Update user profile"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    update_data = {}
    if profile_data.name is not None:
        update_data["name"] = profile_data.name
    if profile_data.picture is not None:
        update_data["picture"] = profile_data.picture
    
    if update_data:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    return updated_user


@api_router.post("/auth/change-password")
async def change_password(request: Request, password_data: PasswordChangeRequest):
    """Change password for authenticated user"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get user with password hash
    user_doc = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    
    if not user_doc.get("password_hash"):
        raise HTTPException(status_code=400, detail="This account uses Google Sign-In. Password cannot be changed.")
    
    if not verify_password(password_data.current_password, user_doc["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    if len(password_data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    
    new_hash = hash_password(password_data.new_password)
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"password_hash": new_hash}})
    
    return {"message": "Password changed successfully"}


@api_router.post("/auth/forgot-password")
async def forgot_password(request: PasswordResetRequest):
    """Request password reset"""
    user_doc = await db.users.find_one({"email": request.email}, {"_id": 0})
    
    # Always return success to prevent email enumeration
    if not user_doc:
        return {"message": "If an account exists with this email, a reset link has been sent."}
    
    if not user_doc.get("password_hash"):
        return {"message": "If an account exists with this email, a reset link has been sent."}
    
    # Create reset token
    reset = PasswordReset(user_id=user_doc["user_id"])
    reset_doc = reset.model_dump()
    reset_doc['expires_at'] = reset_doc['expires_at'].isoformat()
    reset_doc['created_at'] = reset_doc['created_at'].isoformat()
    await db.password_resets.insert_one(reset_doc)
    
    # In production, send email with reset link
    # For now, return the token (in production, this would be sent via email)
    logger.info(f"Password reset token for {request.email}: {reset.token}")
    
    return {
        "message": "If an account exists with this email, a reset link has been sent.",
        "reset_token": reset.token  # Remove this in production - only for testing
    }


@api_router.post("/auth/reset-password")
async def reset_password(request: PasswordResetConfirm):
    """Reset password with token"""
    reset_doc = await db.password_resets.find_one({"token": request.token, "used": False}, {"_id": 0})
    
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check expiry
    expires_at = reset_doc.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Update password
    new_hash = hash_password(request.new_password)
    await db.users.update_one({"user_id": reset_doc["user_id"]}, {"$set": {"password_hash": new_hash}})
    
    # Mark token as used
    await db.password_resets.update_one({"token": request.token}, {"$set": {"used": True}})
    
    return {"message": "Password reset successfully. You can now login with your new password."}


@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout - delete session and clear cookie"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}


# ============== MEETING ENDPOINTS ==============

def serialize_meeting(meeting: dict) -> dict:
    if '_id' in meeting:
        del meeting['_id']
    if 'created_at' in meeting and isinstance(meeting['created_at'], str):
        meeting['created_at'] = datetime.fromisoformat(meeting['created_at'].replace('Z', '+00:00'))
    if 'updated_at' in meeting and isinstance(meeting['updated_at'], str):
        meeting['updated_at'] = datetime.fromisoformat(meeting['updated_at'].replace('Z', '+00:00'))
    return meeting


@api_router.get("/")
async def root():
    return {"message": "Summary Boss API"}


@api_router.post("/meetings", response_model=Meeting)
async def create_meeting(meeting_data: MeetingCreate, user: dict = Depends(require_auth)):
    meeting = Meeting(
        user_id=user["user_id"],
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
async def get_meetings(search: Optional[str] = None, limit: int = 50, user: dict = Depends(require_auth)):
    query = {"user_id": user["user_id"]}
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"transcript": {"$regex": search, "$options": "i"}}
        ]
    
    meetings = await db.meetings.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    for meeting in meetings:
        serialize_meeting(meeting)
    
    return meetings


@api_router.get("/meetings/{meeting_id}", response_model=Meeting)
async def get_meeting(meeting_id: str, user: dict = Depends(require_auth)):
    meeting = await db.meetings.find_one({"id": meeting_id, "user_id": user["user_id"]}, {"_id": 0})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    return serialize_meeting(meeting)


@api_router.put("/meetings/{meeting_id}", response_model=Meeting)
async def update_meeting(meeting_id: str, meeting_data: MeetingUpdate, user: dict = Depends(require_auth)):
    existing = await db.meetings.find_one({"id": meeting_id, "user_id": user["user_id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    update_data = {k: v for k, v in meeting_data.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.meetings.update_one({"id": meeting_id}, {"$set": update_data})
    
    updated = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    return serialize_meeting(updated)


@api_router.delete("/meetings/{meeting_id}")
async def delete_meeting(meeting_id: str, user: dict = Depends(require_auth)):
    result = await db.meetings.delete_one({"id": meeting_id, "user_id": user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {"message": "Meeting deleted successfully"}


@api_router.post("/meetings/{meeting_id}/upload")
async def upload_audio(meeting_id: str, file: UploadFile = File(...), user: dict = Depends(require_auth)):
    meeting = await db.meetings.find_one({"id": meeting_id, "user_id": user["user_id"]})
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    allowed_types = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/webm", "audio/mp4", "audio/m4a", "video/webm", "video/mp4"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"File type not supported. Allowed: {allowed_types}")
    
    # Save file locally (in production, this would go to cloud storage)
    filename = f"{user['user_id']}_{meeting_id}_{file.filename}"
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
async def transcribe_meeting(meeting_id: str, user: dict = Depends(require_auth)):
    meeting = await db.meetings.find_one({"id": meeting_id, "user_id": user["user_id"]})
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
async def summarize_meeting(meeting_id: str, user: dict = Depends(require_auth)):
    meeting = await db.meetings.find_one({"id": meeting_id, "user_id": user["user_id"]})
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
                "executive_summary": "A brief 2-3 sentence high-level overview for executives who need quick insights without details",
                "summary": "A comprehensive 2-3 paragraph summary of the meeting covering all main points discussed",
                "action_items": ["Action item 1", "Action item 2", ...],
                "key_decisions": ["Decision 1", "Decision 2", ...],
                "topics": ["Topic 1", "Topic 2", ...]
            }
            
            The executive_summary should be concise and highlight only the most critical outcomes.
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
                "executive_summary": "",
                "summary": response,
                "action_items": [],
                "key_decisions": [],
                "topics": []
            }
        
        await db.meetings.update_one(
            {"id": meeting_id},
            {"$set": {
                "executive_summary": summary_data.get("executive_summary", ""),
                "summary": summary_data.get("summary", ""),
                "action_items": summary_data.get("action_items", []),
                "key_decisions": summary_data.get("key_decisions", []),
                "topics": summary_data.get("topics", []),
                "status": "completed",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return SummaryResponse(
            executive_summary=summary_data.get("executive_summary", ""),
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
    file: UploadFile = File(...),
    user: dict = Depends(require_auth)
):
    meeting = Meeting(
        user_id=user["user_id"],
        title=title,
        description=description,
        status="processing"
    )
    
    doc = meeting.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.meetings.insert_one(doc)
    meeting_id = meeting.id
    
    filename = f"{user['user_id']}_{meeting_id}_{file.filename}"
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
                "executive_summary": "A brief 2-3 sentence high-level overview for executives who need quick insights without details",
                "summary": "A comprehensive 2-3 paragraph summary of the meeting covering all main points discussed",
                "action_items": ["Action item 1", "Action item 2", ...],
                "key_decisions": ["Decision 1", "Decision 2", ...],
                "topics": ["Topic 1", "Topic 2", ...]
            }
            
            The executive_summary should be concise and highlight only the most critical outcomes.
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
                "executive_summary": "",
                "summary": response,
                "action_items": [],
                "key_decisions": [],
                "topics": []
            }
        
        await db.meetings.update_one(
            {"id": meeting_id},
            {"$set": {
                "executive_summary": summary_data.get("executive_summary", ""),
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
async def get_stats(user: dict = Depends(require_auth)):
    total_meetings = await db.meetings.count_documents({"user_id": user["user_id"]})
    completed_meetings = await db.meetings.count_documents({"user_id": user["user_id"], "status": "completed"})
    pending_meetings = await db.meetings.count_documents({
        "user_id": user["user_id"],
        "status": {"$in": ["pending", "processing", "uploaded", "transcribed", "transcribing", "summarizing"]}
    })
    
    return {
        "total_meetings": total_meetings,
        "completed_meetings": completed_meetings,
        "pending_meetings": pending_meetings
    }


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
