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

// Saad's real profile as sent by the extension (skills + GitHub projects, no experience)
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
    // Biographical facts — intentionally empty (real state of Saad's profile)
    experience: [],
    education: [],
    // Real GitHub projects (RIE will analyze these)
    projects: [
        {
            name: 'ResumeX',
            languages: ['JavaScript', 'HTML', 'CSS'],
            stars: 15,
            url: 'https://github.com/SaadHaider01/resumex',
            mockTree: ['manifest.json', 'extension/background.js', 'extension/linkedinScraper.js', 'backend/server.js', 'package.json', 'README.md'],
            mockFiles: {
                'manifest.json': JSON.stringify({ manifest_version: 3, name: 'ResumeX' }),
                'package.json': JSON.stringify({ dependencies: { express: '^4.18.2', pdfkit: '^0.13.0' } }),
                'README.md': 'ResumeX is a Chrome extension that automates form autofilling and LinkedIn scraping with a backend PDF generation service.'
            }
        },
        {
            name: 'J.A.R.V.I.S',
            languages: ['Python'],
            stars: 8,
            url: 'https://github.com/SaadHaider01/jarvis',
            mockTree: ['requirements.txt', 'main.py', 'voice_assistant.py', 'README.md'],
            mockFiles: {
                'requirements.txt': 'openai-whisper\nedge-tts\nopenai',
                'README.md': 'An advanced, locally-hosted AI personal assistant with real-time offline wake-word detection, Whisper speech-to-text, and Edge-TTS.'
            }
        },
        {
            name: 'LInguaVoice',
            languages: ['JavaScript'],
            stars: 5,
            url: 'https://github.com/SaadHaider01/linguavoice',
            mockTree: ['package.json', 'src/App.js', 'README.md'],
            mockFiles: {
                'package.json': JSON.stringify({ dependencies: { react: '^18.2.0' } }),
                'README.md': 'A multilingual voice-to-voice translation application using JavaScript and Web Speech API. Supported 12 languages with real-time translation latency under 300ms.'
            }
        }
    ],
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
