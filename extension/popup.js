/**
 * Popup Script - Main Extension UI Logic
 */

// DOM Elements
const jobTitleInput = document.getElementById('jobTitle');
const githubProfileInput = document.getElementById('githubProfile');
const linkedinProfileInput = document.getElementById('linkedinProfile');
const generateBtn = document.getElementById('generateBtn');
const extractBtn = document.getElementById('extractBtn');
const statusDiv = document.getElementById('status');
const resultsDiv = document.getElementById('results');
const actionButtonsDiv = document.getElementById('actionButtons');
const saveBtn = document.getElementById('saveBtn');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const copyBtn = document.getElementById('copyBtn');
const autoFillSection = document.getElementById('autoFillSection');
const autoFillBtn = document.getElementById('autoFillBtn');
const autoFillStatus = document.getElementById('autoFillStatus');

// Settings Elements
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const apiUrlInput = document.getElementById('apiUrlInput');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');

// Default API URL (no user input needed)
const DEFAULT_API_URL = 'https://resumex-5ij7.onrender.com';

// Storage keys
const STORAGE_KEYS = {
    JOB_TITLE: 'jobTitle',
    GITHUB_PROFILE: 'githubProfile',
    LINKEDIN_PROFILE: 'linkedinProfile',
    API_URL: 'apiUrl',
    PERSONAL_INFO: 'personalInfo'
};

// Global state
let currentResumeData = null;
let currentJobDescription = null;

/**
 * Get the API URL from storage or use default
 */
async function getApiUrl() {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.API_URL);
    return stored.apiUrl || DEFAULT_API_URL;
}

/**
 * Extract GitHub username from a profile link or raw username
 * e.g., "https://github.com/octocat" -> "octocat"
 */
function extractGithubUsername(input) {
    const trimmed = input.trim();
    // If it's a URL, extract the username
    const match = trimmed.match(/github\.com\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    // Otherwise treat as raw username
    return trimmed;
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Load saved settings
    const saved = await chrome.storage.local.get([
        STORAGE_KEYS.JOB_TITLE,
        STORAGE_KEYS.GITHUB_PROFILE,
        STORAGE_KEYS.LINKEDIN_PROFILE,
        STORAGE_KEYS.API_URL
    ]);

    if (saved.jobTitle) jobTitleInput.value = saved.jobTitle;
    if (saved.githubProfile) githubProfileInput.value = saved.githubProfile;
    if (saved.linkedinProfile) linkedinProfileInput.value = saved.linkedinProfile;
    apiUrlInput.value = saved.apiUrl || DEFAULT_API_URL;

    // Event listeners
    generateBtn.addEventListener('click', handleGenerateResume);
    saveBtn.addEventListener('click', handleSaveResume);
    downloadPdfBtn.addEventListener('click', handleDownloadPDF);
    copyBtn.addEventListener('click', handleCopyJson);
    autoFillBtn.addEventListener('click', handleAutoFill);

    // Toggle settings panel
    settingsBtn.addEventListener('click', () => {
        const isHidden = settingsPanel.style.display === 'none';
        settingsPanel.style.display = isHidden ? 'block' : 'none';
    });

    // Save API URL
    saveSettingsBtn.addEventListener('click', async () => {
        const url = apiUrlInput.value.trim();
        await chrome.storage.local.set({ [STORAGE_KEYS.API_URL]: url });
        
        saveSettingsBtn.textContent = '✓ Saved!';
        saveSettingsBtn.style.background = '#218838';
        
        setTimeout(() => {
            saveSettingsBtn.textContent = 'Save';
            saveSettingsBtn.style.background = '#28a745';
            settingsPanel.style.display = 'none';
        }, 1500);
    });

    // Save settings on change
    jobTitleInput.addEventListener('change', () => {
        chrome.storage.local.set({ [STORAGE_KEYS.JOB_TITLE]: jobTitleInput.value });
    });
    githubProfileInput.addEventListener('change', () => {
        chrome.storage.local.set({ [STORAGE_KEYS.GITHUB_PROFILE]: githubProfileInput.value });
    });
    linkedinProfileInput.addEventListener('change', () => {
        chrome.storage.local.set({ [STORAGE_KEYS.LINKEDIN_PROFILE]: linkedinProfileInput.value });
    });
});

/**
 * Main function to generate tailored resume
 */
async function handleGenerateResume() {
    const githubProfile = githubProfileInput.value.trim();
    const githubUsername = extractGithubUsername(githubProfile);
    const apiUrl = await getApiUrl();

    // Validation
    if (!githubUsername) {
        showStatus('Please enter your GitHub profile link', 'error');
        return;
    }

    // Disable button
    generateBtn.disabled = true;
    showStatus('Extracting job description from page...', 'loading');
    hideResults();

    try {
        // Step 1: Get job description from current page
        const jobDescription = await extractJobDescription();

        if (!jobDescription || jobDescription.trim().length < 50) {
            showStatus('Could not extract job description. Make sure you are on a job posting page.', 'error');
            generateBtn.disabled = false;
            return;
        }

        showStatus('Sending request to backend API...', 'loading');

        // Step 2: Call backend API
        const response = await fetch(`${apiUrl}/api/generate-tailored-resume`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jobDescription,
                githubUsername,
                linkedinProfile: linkedinProfileInput.value.trim()
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `API request failed with status ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Resume generation failed');
        }

        // Store data globally for save/download
        currentResumeData = {
            resume: data.resume,
            tailoringBlueprint: data.tailoringData?.blueprint || {},
            tailoringData: data.tailoringData
        };
        currentJobDescription = jobDescription;

        // Step 3: Display results
        showStatus('Resume generated successfully! 🎉', 'success');
        displayResume(data.resume, data.tailoringData);
        showActionButtons();
        showAutoFillSection();

    } catch (error) {
        console.error('Error:', error);
        showStatus(`Error: ${error.message}`, 'error');
    } finally {
        generateBtn.disabled = false;
    }
}

/**
 * Extract job description from current tab
 */
async function extractJobDescription() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: scrapeJobDescription
        });

        return results[0]?.result || '';
    } catch (error) {
        console.error('Error extracting job description:', error);
        throw new Error('Failed to extract job description from page');
    }
}

/**
 * Scraping function that runs in page context
 * This is injected into the page via content script
 */
function scrapeJobDescription() {
    // Remove script tags, style tags, and hidden elements
    const clonedBody = document.body.cloneNode(true);

    // Remove unwanted elements
    const unwantedSelectors = ['script', 'style', 'nav', 'header', 'footer', 'iframe', 'noscript'];
    unwantedSelectors.forEach(selector => {
        clonedBody.querySelectorAll(selector).forEach(el => el.remove());
    });

    // Get visible text
    let text = clonedBody.innerText || clonedBody.textContent || '';

    // Clean up text
    text = text
        .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
        .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
        .trim();

    return text;
}

/**
 * Display resume in popup
 */
function displayResume(resume, tailoringData) {
    // Professional Summary
    document.getElementById('summary').textContent = resume.professionalSummary || 'N/A';

    // Skills
    const skillsDiv = document.getElementById('skills');
    skillsDiv.innerHTML = '';

    if (resume.skills) {
        const allSkills = [
            ...(resume.skills.technical || []),
            ...(resume.skills.tools || []),
            ...(resume.skills.soft || [])
        ];

        const skillTags = document.createElement('div');
        skillTags.className = 'skill-tags';

        allSkills.forEach(skill => {
            const tag = document.createElement('span');
            tag.className = 'skill-tag';
            tag.textContent = skill;
            skillTags.appendChild(tag);
        });

        skillsDiv.appendChild(skillTags);
    }

    // Projects
    const projectsDiv = document.getElementById('projects');
    projectsDiv.innerHTML = '';

    if (resume.projects && resume.projects.length > 0) {
        resume.projects.slice(0, 3).forEach(project => {
            const projectItem = document.createElement('div');
            projectItem.className = 'project-item';
            projectItem.innerHTML = `
                <strong>${project.name}</strong>
                <p style="margin-top: 5px; font-size: 12px; color: #666;">${project.description || ''}</p>
            `;
            projectsDiv.appendChild(projectItem);
        });
    } else {
        projectsDiv.textContent = 'No projects available';
    }

    // Tailoring Data
    const tailoringDiv = document.getElementById('tailoringData');
    tailoringDiv.innerHTML = '';

    if (tailoringData && tailoringData.blueprint) {
        const blueprint = tailoringData.blueprint;

        tailoringDiv.innerHTML = `
            <div class="tailoring-item">
                <strong>Matched Skills:</strong> ${blueprint.matchedSkills?.join(', ') || 'None'}
            </div>
            <div class="tailoring-item">
                <strong>Missing Skills:</strong> ${blueprint.missingSkills?.join(', ') || 'None'}
            </div>
            <div class="tailoring-item">
                <strong>Experience Match:</strong> ${blueprint.experienceMatchLevel || 'N/A'}
            </div>
            <div class="tailoring-item">
                <strong>Recommended Projects:</strong> ${blueprint.recommendedProjects?.join(', ') || 'None'}
            </div>
        `;
    }

    // Raw JSON
    document.getElementById('rawJson').textContent = JSON.stringify(resume, null, 2);

    // Show results
    showResults();
}

/**
 * Copy JSON to clipboard
 */
async function handleCopyJson() {
    const jsonText = document.getElementById('rawJson').textContent;

    try {
        await navigator.clipboard.writeText(jsonText);
        copyBtn.textContent = '✓ Copied!';
        setTimeout(() => {
            copyBtn.textContent = 'Copy Resume JSON';
        }, 2000);
    } catch (error) {
        console.error('Failed to copy:', error);
        showStatus('Failed to copy to clipboard', 'error');
    }
}

/**
 * Show status message
 */
function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.classList.remove('hidden');
}

/**
 * Show results section
 */
function showResults() {
    resultsDiv.classList.remove('hidden');
}

/**
 * Hide results section
 */
function hideResults() {
    resultsDiv.classList.add('hidden');
}
