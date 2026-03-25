# Backend Testing Guide - Phase 1

## Prerequisites
1. Node.js 18+ installed
2. OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

## Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
```bash
# Copy the example env file
cp .env.example .env

# Edit .env and add your OpenAI API key
# Replace 'your_openai_api_key_here' with your actual key
```

### 3. Start the Server
```bash
npm start
```

Expected output:
```
🚀 Resume Generator API running on http://localhost:3000
📋 Health check: http://localhost:3000/health
🔧 Generate resume: POST http://localhost:3000/api/generate-resume
```

---

## Testing with curl

### Health Check
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "Resume Generator API is running"
}
```

### Generate Resume (Using Mock Data)
```bash
curl -X POST http://localhost:3000/api/generate-resume \
  -H "Content-Type: application/json" \
  -d '{
    "jobDescription": "We are seeking a Senior Full-Stack Engineer with 5+ years of experience in React, Node.js, and AWS. You will lead development of scalable microservices, mentor junior developers, and architect cloud-native solutions. Required skills: JavaScript, TypeScript, React, Node.js, Express, AWS, Docker, CI/CD, MongoDB. Experience with real-time systems and high-traffic applications preferred."
  }'
```

### Generate Resume (With Custom User Profile)
```bash
curl -X POST http://localhost:3000/api/generate-resume \
  -H "Content-Type: application/json" \
  -d '{
    "jobDescription": "Looking for a Frontend Developer skilled in React and modern JavaScript...",
    "userProfile": {
      "personalInfo": {
        "name": "Jane Smith",
        "email": "jane@example.com"
      },
      "skills": {
        "languages": ["JavaScript", "HTML", "CSS"],
        "frameworks": ["React", "Vue.js"]
      },
      "experience": []
    }
  }'
```

---

## Testing with Postman

### 1. Import Collection
Create a new request in Postman with these settings:

**Request Type:** POST  
**URL:** `http://localhost:3000/api/generate-resume`  
**Headers:**
- `Content-Type: application/json`

**Body (raw JSON):**
```json
{
  "jobDescription": "We are seeking a Senior Full-Stack Engineer with 5+ years of experience in React, Node.js, and AWS. You will lead development of scalable microservices, mentor junior developers, and architect cloud-native solutions. Required skills: JavaScript, TypeScript, React, Node.js, Express, AWS, Docker, CI/CD, MongoDB. Experience with real-time systems and high-traffic applications preferred."
}
```

### 2. Send Request
Click **Send** and expect a response like:

```json
{
  "success": true,
  "resume": {
    "personalInfo": {
      "name": "John Doe",
      "email": "john.doe@example.com",
      ...
    },
    "professionalSummary": "Senior Full-Stack Engineer with 5+ years...",
    "skills": {
      "technical": ["JavaScript", "TypeScript", "React", "Node.js", ...],
      ...
    },
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

## Sample Request & Response

### Request
```json
{
  "jobDescription": "We are seeking a Senior Full-Stack Engineer with 5+ years of experience in React, Node.js, and AWS. You will lead development of scalable microservices, mentor junior developers, and architect cloud-native solutions. Required skills: JavaScript, TypeScript, React, Node.js, Express, AWS, Docker, CI/CD, MongoDB."
}
```

### Response (Success)
```json
{
  "success": true,
  "resume": {
    "personalInfo": {
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+1 (555) 123-4567",
      "location": "San Francisco, CA",
      "linkedin": "linkedin.com/in/johndoe",
      "github": "github.com/johndoe"
    },
    "professionalSummary": "Senior Full-Stack Engineer with 5+ years of hands-on experience architecting and developing scalable microservices using React, Node.js, and AWS. Proven track record of leading high-performing teams and delivering cloud-native solutions that serve millions of users.",
    "skills": {
      "technical": ["JavaScript", "TypeScript", "React", "Node.js", "Express.js", "AWS", "MongoDB", "Docker"],
      "tools": ["Git", "CI/CD", "Redis", "PostgreSQL"],
      "soft": ["Team Leadership", "Mentorship", "Agile Methodologies"]
    },
    "experience": [
      {
        "company": "TechCorp Inc.",
        "position": "Senior Software Engineer",
        "duration": "Jan 2021 - Present",
        "location": "San Francisco, CA",
        "achievements": [
          "Led development of microservices architecture serving 1M+ users, improving system scalability by 300%",
          "Architected real-time notification system using WebSockets and Redis, handling 10k concurrent connections",
          "Implemented CI/CD pipeline using GitHub Actions, reducing deployment time by 60%",
          "Mentored 5 junior developers and conducted code reviews to maintain code quality standards"
        ]
      }
    ],
    "education": [...],
    "projects": [...],
    "certifications": ["AWS Certified Solutions Architect - Associate"]
  },
  "metadata": {
    "model": "gpt-4o-mini",
    "tokensUsed": 1523,
    "generatedAt": "2026-02-05T15:53:21.123Z"
  }
}
```

### Response (Error - Missing Job Description)
```json
{
  "success": false,
  "error": "Job description is required and must be a non-empty string"
}
```

### Response (Error - Invalid API Key)
```json
{
  "success": false,
  "error": "OpenAI API authentication failed. Please check your API key."
}
```

---

## Common Failure Points

### ❌ Server won't start
**Symptom:** `Error: Cannot find module 'express'`  
**Solution:** Run `npm install` in the `backend/` directory

### ❌ OpenAI authentication error
**Symptom:** `OpenAI API authentication failed`  
**Solution:** 
1. Check that `.env` file exists in `backend/`
2. Verify `OPENAI_API_KEY` is set correctly
3. Ensure API key is valid at https://platform.openai.com/api-keys

### ❌ Port already in use
**Symptom:** `Error: listen EADDRINUSE: address already in use :::3000`  
**Solution:** 
- Change port in `.env`: `PORT=3001`
- Or kill the process using port 3000

### ❌ Invalid JSON response from OpenAI
**Symptom:** `Failed to parse AI response`  
**Solution:** This is rare but can happen. Simply retry the request.

### ❌ Rate limit exceeded
**Symptom:** `OpenAI API rate limit exceeded`  
**Solution:** Wait a few seconds and retry, or upgrade your OpenAI plan

---

## What Was Built

✅ **Express server** (`server.js`)  
✅ **POST /api/generate-resume endpoint**  
✅ **OpenAI integration** with JSON response format  
✅ **LLM prompt template** (`promptTemplate.js`)  
✅ **Mock user profile** (`mockData.js`)  
✅ **Environment configuration** (`.env.example`)  
✅ **Error handling** for common failure cases  
✅ **Health check endpoint** for monitoring  

---

## Next Steps (Phase 2)

In the next phase, we will:
1. Build a **Job Description Parser** module
2. Extract structured data (role, skills, keywords) from raw text
3. Make the parser reusable and testable
