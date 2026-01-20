# Summary Boss - Meeting Summary Application

## Original Problem Statement
Build a "Summary AI" app that records meetings and summarizes them for business overview. The app should be named "Summary Boss" with a green and white color scheme.

## User Personas
1. **Business Professionals** - Need to capture and review meeting content
2. **Team Managers** - Want actionable summaries and action items
3. **Executives** - Need quick business overviews from meetings

## Core Requirements
- Record meetings directly in browser
- Upload audio/video files for processing
- AI-powered transcription using OpenAI Whisper
- AI-powered summarization using GPT-5.2
- Extract action items, key decisions, and topics
- Meeting history with search functionality
- Export summaries as text files
- User authentication (email/password + Google)
- Subscription payments via Stripe

## Architecture & Tech Stack
- **Frontend**: React with Tailwind CSS, Shadcn/UI components
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **File Storage**: MongoDB GridFS (audio files stored in database)
- **AI Services**: 
  - OpenAI Whisper (speech-to-text transcription)
  - GPT-5.2 (meeting summarization)
- **Payments**: Stripe (subscriptions)
- **Authentication**: JWT (email/password), Google OAuth 2.0 (Emergent-managed)

## What's Been Implemented (January 2025)

### ✅ Backend (server.py)
- Complete user authentication (register, login, logout)
- Google OAuth 2.0 integration
- Password management (forgot password, reset password, change password)
- User profile management
- Meeting CRUD API endpoints
- **Audio file upload to MongoDB GridFS**
- **Audio file streaming from GridFS**
- Transcription endpoint (OpenAI Whisper integration)
- Summarization endpoint (GPT-5.2 integration)
- Combined process endpoint (upload + transcribe + summarize)
- Dashboard statistics endpoint
- **Subscription Plans API** ($7/week, $78/year with 3-day trial)
- **Stripe Checkout Session API**
- **Payment Status Polling API**
- **Stripe Webhook Handler**
- **Promo Code System** (code "Gillian" = lifetime free access)
- **Referral System** ($50 reward when friend signs up for yearly plan)

### ✅ Frontend Pages
1. **Landing Page** - Hero section, features, how it works, CTA
2. **Login Page** - Email/password + Google OAuth
3. **Register Page** - With referral code support via URL params
4. **Forgot Password Page** - Request password reset
5. **Reset Password Page** - Set new password with token
6. **Dashboard** - Quick actions, stats, recent meetings
7. **Record Meeting** - Browser audio recording with waveform visualizer
8. **Upload Meeting** - Drag & drop file upload
9. **Meeting Details** - Split view transcript + summary + executive summary
10. **Meeting History** - List with search and filter
11. **Profile Page** - User settings and password change
12. **Subscription Page** - Pricing plans, promo code input, referral section
13. **Subscription Success** - Payment confirmation with polling

### ✅ Subscription Plans
- **Weekly**: $7/week with 3-day free trial
- **Yearly**: $78/year with 3-day free trial (Best Value)
- **Lifetime**: Via promo code "Gillian" (case-insensitive)

### ✅ Referral Program
- Users get unique referral code (REF prefix)
- $50 reward when referred user subscribes to yearly plan
- Referral link: `{domain}/register?ref={CODE}`

### ✅ Design System
- Typography: Manrope (headings), Public Sans (body)
- Colors: Green primary, White background
- Branding: "Summary Boss"

## Testing Status (January 2025)
- **Iteration 5**: 100% pass rate (21/21 backend tests, all frontend tests)
- Subscription plans, promo codes, referral system fully tested
- Authentication flows fully tested
- Login error handling verified

## Prioritized Backlog

### P0 (Critical) - COMPLETED ✅
- ✅ Core recording functionality
- ✅ File upload functionality
- ✅ Transcription integration
- ✅ Summarization integration
- ✅ Meeting history
- ✅ User authentication
- ✅ Subscription plans with Stripe
- ✅ Promo code system
- ✅ Referral program

### P1 (High Priority) - READY FOR DEPLOYMENT
- Deploy to production
- Real production Stripe keys setup

### P2 (Medium Priority)
- PDF export for summaries
- Email sharing functionality
- User profile picture upload
- Team/organization features

### P3 (Low Priority)
- Real-time transcription
- Speaker diarization
- Meeting templates
- Calendar integration

## 3rd Party Integrations
| Service | Status | Key Type |
|---------|--------|----------|
| OpenAI Whisper | ✅ Active | Emergent LLM Key |
| OpenAI GPT-5.2 | ✅ Active | Emergent LLM Key |
| Stripe | ✅ Active | Test keys (needs production keys) |
| Google Auth | ✅ Active | Emergent-managed |

## API Endpoints Summary
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/google/session` - Google OAuth
- `POST /api/auth/logout` - Logout
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/change-password` - Change password
- `GET /api/meetings` - List user's meetings
- `POST /api/meetings` - Create meeting
- `GET /api/meetings/{id}` - Get meeting details
- `POST /api/meetings/process` - Upload, transcribe, summarize
- `GET /api/subscription/plans` - Get available plans
- `GET /api/subscription/status` - Get user's subscription status
- `POST /api/subscription/checkout` - Create Stripe checkout
- `POST /api/promo/apply` - Apply promo code
- `GET /api/referrals` - Get referral info
- `GET /api/referrals/validate/{code}` - Validate referral code

## Key Database Collections
- `users` - User accounts and subscription status
- `meetings` - Meeting data and summaries
- `user_sessions` - Authentication sessions
- `password_resets` - Password reset tokens
- `referrals` - Referral tracking
- `payment_transactions` - Payment history
- `audio_files.files` - GridFS file metadata
- `audio_files.chunks` - GridFS file data chunks

## Notes for Deployment
1. Stripe is using test keys - need production keys for live payments
2. All environment variables properly configured via .env files
3. CORS configured to accept all origins (adjust for production)
4. MongoDB connection via MONGO_URL environment variable
5. **Audio files are stored in MongoDB GridFS - no external storage needed**
