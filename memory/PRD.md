# Summary AI - Meeting Summary Application

## Original Problem Statement
Build a summary AI app that records meetings and summarizes them for business overview - Replica of Summary AI app. Added Stripe payment integration with monthly and yearly subscriptions.

## Architecture & Tech Stack
- **Frontend**: React with Tailwind CSS, Shadcn/UI components
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **AI Services**: 
  - OpenAI Whisper (speech-to-text transcription)
  - GPT-5.2 (meeting summarization)
- **Payments**: Stripe (subscriptions)
- **Authentication**: None (open access)

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
- Subscription payments via Stripe

## What's Been Implemented (December 2025)

### Backend (server.py)
- Meeting CRUD API endpoints
- Audio file upload endpoint
- Transcription endpoint (OpenAI Whisper integration)
- Summarization endpoint (GPT-5.2 integration)
- Combined process endpoint (upload + transcribe + summarize)
- Dashboard statistics endpoint
- **NEW: Subscription Plans API**
- **NEW: Stripe Checkout Session API**
- **NEW: Payment Status Polling API**
- **NEW: Stripe Webhook Handler**
- **NEW: Payment Transactions Collection**

### Frontend Pages
1. **Landing Page** - Hero section, features, how it works, CTA, **pricing section**
2. **Dashboard** - Quick actions, stats, recent meetings
3. **Record Meeting** - Browser audio recording with waveform visualizer
4. **Upload Meeting** - Drag & drop file upload
5. **Meeting Details** - Split view transcript + summary
6. **Meeting History** - List with search and filter
7. **NEW: Pricing Page** - Monthly ($9.99) & Yearly ($79.99) subscription plans
8. **NEW: Subscription Success** - Payment confirmation with polling

### Subscription Plans
- **Monthly**: $9.99/month
- **Yearly**: $79.99/year (Save $40!)

### Design System
- Typography: Manrope (headings), Public Sans (body)
- Colors: Blue primary (#2563EB), Dark sidebar (#0F172A)
- Light theme with professional look

## Prioritized Backlog

### P0 (Critical) - DONE
- ✅ Core recording functionality
- ✅ File upload functionality
- ✅ Transcription integration
- ✅ Summarization integration
- ✅ Meeting history
- ✅ Stripe subscription payments

### P1 (High Priority)
- User authentication
- Link subscriptions to user accounts
- PDF export
- Email summary sharing

### P2 (Medium Priority)
- Real-time transcription
- Speaker diarization
- Meeting templates
- Calendar integration

## Next Tasks
1. Add user authentication (JWT or social login)
2. Link subscription status to user accounts
3. Implement PDF export for summaries
4. Add email sharing functionality
