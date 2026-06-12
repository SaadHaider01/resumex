# Chrome Extension - Loading & Testing Guide

This guide describes how to load, configure, and test the **ResumeX** Chrome Extension (Manifest V3) in your local environment.

---

## 📦 How to Load Extension in Chrome

### Step 1: Enable Developer Mode
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Toggle **Developer mode** ON using the switch in the top-right corner.

### Step 2: Load Unpacked Extension
1. Click the **"Load unpacked"** button in the top-left corner.
2. Navigate to your workspace directory: `d:\resumex\extension`.
3. Select the `extension` folder and click **"Select Folder"**.

The **ResumeX** icon will now appear in your Chrome toolbar!

---

## 🧪 How to Test Features

### 1. Setup Backend
Make sure the backend server is running:
```bash
cd backend
npm install
node server.js
```
The console will output: `🚀 Resume Generator API running on http://localhost:3001`

---

### 2. Synchronize Profiles
1. Click the **ResumeX** extension icon in your Chrome toolbar.
2. Enter your LinkedIn Profile URL (e.g. `https://www.linkedin.com/in/saad-haider-455123258`) and GitHub Profile URL (e.g. `https://github.com/SaadHaider01`).
3. Click the **🔄 Sync** button.
4. **Behavior**: 
   * The extension programmatically opens your LinkedIn and GitHub pages in background tabs.
   * If you are logged out of LinkedIn, it highlights the LinkedIn tab so you can log in, avoiding auth blocks.
   * An async helper scrolls the LinkedIn page to force lazy-loaded sections (Experience, Education, Skills) to render.
   * Once scraped, it merges your repositories and profile metadata, caches them locally, and closes the background tabs. The popup status will display the date and time of the last sync.

---

### 3. Generate Tailored Resume
1. Navigate to a test job description page (e.g., open `extension/tests/test-job-listing.html`).
2. Open the extension popup, enter a target job title (e.g., `Full Stack Developer Intern`), and click **Generate Tailored Resume**.
3. **Flow**:
   * Extracts page content, stripping out headers, footers, and script tags.
   * Queries the backend `/api/generate-tailored-resume` endpoint.
   * Backend uses OpenRouter (routed to a free model) with a `6000` max token capacity and a 3-attempt fail-safe retry loop.
   * Returns a tailored resume clean of any fake companies or institutions.
4. **Results**: Displays Professional Summary, matched skills tags, and projects in the popup.

---

### 4. Save to Vault & Download PDF
*   **💾 Save to Vault**: Saves the resume structure, job description, and tailoring blueprint into the backend database.
*   **📥 Download PDF**: Compiles a professional PDF in the backend using `pdfkit` (featuring an HSL theme, bold section headers, and columns for skills) and prompts a download.

---

### 5. Auto-Fill Application Form
1. Open the application form test page (`extension/tests/test-form.html`).
2. Once you have generated a resume, scroll to the **Application Form Auto-Fill** section of the popup and click **🤖 Auto-Fill Application**.
3. **Behavior**: The form detector semantically identifies input fields (Full Name, Email, LinkedIn, GitHub, Upload Resume), populates the texts, fetches the compiled PDF resume from the backend vault, and auto-uploads the file to the file input.

---

## 🔧 Settings & Configuration

*   **API URL Configuration**: Toggle the settings gear icon to edit the **Backend API URL** (defaults to Render deployment but can be set to `http://localhost:3001` for local development).
*   **Settings Persistence**: Stored parameters (URLs, API URL, and user profile cache) are saved in `chrome.storage.local` and persist across browser sessions.

---

## 🎯 Success Criteria

✅ Extension loads without errors in `chrome://extensions/`  
✅ **Sync** coordinates background tabs, lazy-scrolls LinkedIn, and caches data successfully  
✅ Job description is parsed from active tab content script  
✅ Backend handles API calls and retries on flaky responses  
✅ Vault fallback routes data into local `backend/resumes_db.json` when Mongo is offline  
✅ **Auto-Fill** populates all matched inputs and uploads the PDF resume seamlessly  
✅ Settings persist after closing the popup
