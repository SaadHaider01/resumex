const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), override: true });

const { generateTailoredResume } = require('../services/resumeGenerator');
const { initializeProvider } = require('../services/llmProvider');

// Mock job description matching ResumeX (Browser extension, form autofill, PDF generation)
const mockJD = `
Full-Stack Software Engineer (Chrome Extension Specialist)
We are seeking a developer to build interactive, automated workflow tools.
Responsibilities:
- Build a Chrome browser extension with manifest.json, background workers, and content scripts.
- Implement DOM scraping and form autofill automation.
- Create backend APIs using Node.js, Express, and MongoDB.
- Generate and export clean PDF documents dynamically (e.g. using pdfkit).
Requirements:
- Strong experience in JavaScript, TypeScript, and Python.
- Git, GitHub, and collaborative workflows.
`;

// Mock profile matching the one in RIE/PIE/ResumeX tests
const testProfile = {
    personalInfo: {
        name: 'Saad Haider',
        email: 'saadhaider349@gmail.com',
        phone: '6205907774',
        location: '',
        github: 'https://github.com/SaadHaider01',
        linkedin: 'https://www.linkedin.com/in/saad-haider-455123258'
    },
    skills: {
        technical: ['JavaScript', 'TypeScript', 'Python', 'HTML', 'CSS', 'PHP'],
        tools: ['Git', 'GitHub'],
        soft: []
    },
    experience: [],
    education: [],
    projects: [],
    certifications: []
};

async function runAudit() {
    console.log('🔍 Starting End-to-End Pipeline Audit...');

    // Initialize provider matching backend environment
    const providerName = process.env.LLM_PROVIDER || 'openrouter';
    let apiKey, modelName;
    if (providerName === 'gemini') {
        apiKey = process.env.GEMINI_API_KEY;
        modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    } else if (providerName === 'openrouter') {
        apiKey = process.env.OPENROUTER_API_KEY;
        modelName = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-lite-preview-02-05:free';
    } else {
        apiKey = process.env.OPENAI_API_KEY;
        modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    }

    console.log(`🤖 Using provider: ${providerName}, model: ${modelName}`);

    const llmProvider = initializeProvider({ provider: providerName, apiKey, model: modelName });

    const llmCallWrapper = async (prompt) => {
        const result = await llmProvider.generateText(prompt, {
            temperature: 0.1,
            maxTokens: 3000,
            responseFormat: 'json'
        });
        return result.text;
    };

    try {
        console.log('🔄 Calling generateTailoredResume()...');
        const output = await generateTailoredResume(mockJD, testProfile, 'SaadHaider01', llmCallWrapper);
        
        console.log('💾 Saving output to tailored_resume_debug.json...');
        fs.writeFileSync(
            path.join(__dirname, '../tailored_resume_debug.json'),
            JSON.stringify(output, null, 2),
            'utf8'
        );
        console.log('✅ Done! Output saved.');
    } catch (error) {
        console.error('❌ Error during generation:', error);
    }
}

runAudit();
