# Context-Aware AI Resume Tailoring Extension

A production-ready Chrome extension that automatically generates ATS-optimized resumes tailored to specific job descriptions using AI.

---

## 📋 Project Overview

This browser extension reads job descriptions from the current page, sends them to a backend AI service along with the user's professional profile, and generates a job-specific ATS-optimized resume automatically.

---

## 📂 Current Project Structure

```
resumex/
├── extension/          # Chrome extension code (Phase 5)
│   └── .gitkeep
├── backend/            # Express.js API server
│   ├── server.js       # Main Express server
│   ├── promptTemplate.js   # LLM prompt for resume generation
│   ├── mockData.js     # Mock user profile
│   ├── package.json
│   ├── .env.example    # Environment variables template
│   └── TESTING.md      # Testing guide
├── shared/             # Shared utilities (future phases)
│   └── .gitkeep
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

### Backend Setup
```bash
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Start server
npm start
```

Server runs on `http://localhost:3000`

### Quick Test
```bash
# Health check
curl http://localhost:3000/health

# Generate resume
curl -X POST http://localhost:3000/api/generate-resume \
  -H "Content-Type: application/json" \
  -d '{"jobDescription": "Senior Full-Stack Engineer with React, Node.js, AWS..."}'
```

See [`backend/TESTING.md`](backend/TESTING.md) for complete testing guide.

---

## 🏗️ Tech Stack

**Frontend (Extension):** Chrome Extension (Manifest v3), JavaScript, HTML, CSS  
**Backend:** Node.js, Express.js, OpenAI API  
**Database:** MongoDB (Phase 7)  
**Output:** JSON (current), PDF/DOCX (Phase 6)

---

## 🚦 Development Phases

### ✅ Phase 0 — Project Skeleton & Standards
**Status:** Complete  
Set up folder structure and documentation.

---

### ✅ Phase 1 — Backend Resume Generator (CURRENT)
**Status:** Complete  
**Objective:** Build backend API that generates tailored resumes.

**Endpoints:**
- `GET /health` - Health check
- `POST /api/generate-resume` - Generate tailored resume

**What Was Built:**
- Express server with OpenAI integration
- LLM prompt template for ATS optimization
- Mock user profile data
- Error handling and validation
- Complete testing documentation

**Testing:** See [`backend/TESTING.md`](backend/TESTING.md)

---

### 🔜 Phase 2 — Job Description Parser Module
**Objective:** Convert raw job description text into structured data.

---

### 🔜 Phase 3 — User Profile Aggregation (GitHub)
**Objective:** Fetch and normalize GitHub data.

---

### 🔜 Phase 4 — Resume Tailoring Logic
**Objective:** Match job requirements with user profile.

---

### 🔜 Phase 5 — Chrome Extension (MVP)
**Objective:** Build minimal extension UI.

---

### 🔜 Phase 6 — Resume Export (PDF/DOCX)
**Objective:** Convert resume JSON into downloadable files.

---

### 🔜 Phase 7 — Persistence & Resume Vault
**Objective:** Store generated resumes with MongoDB.

---

## 📝 API Documentation

### POST /api/generate-resume

**Request:**
```json
{
  "jobDescription": "string (required)",
  "userProfile": "object (optional, uses mock data if not provided)"
}
```

**Response:**
```json
{
  "success": true,
  "resume": {
    "personalInfo": {...},
    "professionalSummary": "...",
    "skills": {...},
    "experience": [...],
    "education": [...],
    "projects": [...],
    "certifications": [...]
  },
  "metadata": {
    "model": "gpt-4o-mini",
    "tokensUsed": 1523,
    "generatedAt": "2026-02-05T15:53:21.123Z"
  }
}
```

---

## ⚠️ Common Issues

**Server won't start:** Run `npm install` in `backend/`  
**Auth error:** Check `.env` has valid `OPENAI_API_KEY`  
**Port in use:** Change `PORT` in `.env`  

See [`backend/TESTING.md`](backend/TESTING.md) for detailed troubleshooting.

---

**Current Phase:** 1 (Backend Complete)  
**Last Updated:** 2026-02-05
