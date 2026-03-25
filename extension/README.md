# Chrome Extension - Loading & Testing Guide

## 📦 How to Load Extension in Chrome

### Step 1: Enable Developer Mode
1. Open Chrome and navigate to `chrome://extensions/`
2. Toggle **Developer mode** ON (top right corner)

### Step 2: Load Unpacked Extension
1. Click **"Load unpacked"** button
2. Navigate to: `e:\resumex\extension`
3. Select the folder and click **"Select Folder"**

The extension icon should now appear in your Chrome toolbar!

---

## 🧪 How to Test

### Setup Backend
1. Make sure the backend is running:
   ```bash
   cd backend
   node server.js
   ```
   Should show: `🚀 Resume Generator API running on http://localhost:3000`

### Test on a Job Page
1. Navigate to any job posting (e.g., LinkedIn, Indeed, or any website with job description text)
2. Click the ResumeX extension icon in toolbar
3. Enter your GitHub username (e.g., `octocat`)
4. Click **"Generate Tailored Resume"**

### Expected Flow
1. **Status**: "Extracting job description from page..."
2. **Status**: "Sending request to backend API..."
3. **Status**: "Resume generated successfully! 🎉"
4. **Results** appear with:
   - Professional Summary
   - Skills (as colored tags)
   - Top Projects
   - Tailoring Data (matched/missing skills, experience level)
   - Raw JSON (expandable)

---

## 🐛 Testing Error Scenarios

### Test: Backend Not Running
1. Stop the backend server
2. Try generating resume
3. **Expected**: Error message about API connection failure

### Test: Invalid GitHub Username
1. Enter a non-existent username
2. **Expected**: Backend continues with empty GitHub data

### Test: Empty Page
1. Navigate to a blank page or page with minimal text
2. **Expected**: "Could not extract job description" error

---

## 🔧 Configuration

### Change Backend URL
If backend runs on different port or host:
1. Open extension popup
2. Modify **"Backend API URL"** field
3. Setting is saved automatically

### Settings Persistence
- GitHub Username: Saved to `chrome.storage.local`
- API URL: Saved to `chrome.storage.local`
- Values persist across browser sessions

---

## 📋 Example Test Job Description

Use this sample text on a blank page for testing:

```
Senior Full-Stack Developer

We are looking for an experienced Full-Stack Developer with 5+ years of experience.

Required Skills:
- React, Node.js, TypeScript
- MongoDB, PostgreSQL
- Docker, Kubernetes
- AWS or Azure

Responsibilities:
- Build scalable REST APIs
- Develop responsive web applications
- Work with cross-functional teams
- Mentor junior developers

Qualifications:
- Bachelor's degree in Computer Science
- Strong problem-solving skills
- Experience with microservices architecture
```

Open Chrome DevTools Console, paste:
```javascript
document.body.innerHTML = '<h1>Senior Full-Stack Developer</h1><p>We are looking for...</p>';
```

---

## 🎯 Success Criteria

✅ Extension loads without errors  
✅ Popup opens with input fields  
✅ Job description extracted from page  
✅ API call succeeds (backend logs show request)  
✅ Resume displayed in popup  
✅ Skills shown as colored tags  
✅ Raw JSON expandable and copyable  
✅ Settings persist after closing popup
