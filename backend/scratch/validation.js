/**
 * Post-Implementation Validation Script
 * 
 * Generates and compares tailoring blueprints for 10 realistic job descriptions
 * using both the old metadata-only pipeline and the new RIE pipeline.
 * 
 * Run with: node backend/scratch/validation.js
 */

const { parseJobDescription } = require('../services/jdParser');
const { generateTailoringBlueprint } = require('../services/tailoringService');
const { analyzeRepositories } = require('../services/repositoryIntelligenceService');
const path = require('path');

// ==================== CANDIDATE PROFILE ====================

const candidateProfile = {
    personalInfo: {
        name: 'Saad Haider',
        email: 'saad.haider@example.com',
        phone: '+1-555-0199',
        location: 'San Francisco, CA'
    },
    skills: {
        technical: ['JavaScript', 'TypeScript', 'Python', 'HTML5', 'CSS3'],
        tools: ['Git', 'GitHub'],
        soft: ['collaboration', 'remote teamwork']
    },
    totalExperience: '3 years'
};

// Raw GitHub metadata (what old pipeline relied on)
const rawGithubProjects = [
    {
        name: 'ResumeX',
        description: 'AI resume builder extension',
        languages: ['JavaScript', 'HTML', 'CSS'],
        stars: 15,
        url: 'https://github.com/SaadHaider01/resumex'
    },
    {
        name: 'JARVIS',
        description: 'Personal assistant tool',
        languages: ['Python'],
        stars: 8,
        url: 'https://github.com/SaadHaider01/jarvis'
    },
    {
        name: 'LInguaVoice',
        description: 'Language practice application',
        languages: ['JavaScript'],
        stars: 5,
        url: 'https://github.com/SaadHaider01/linguavoice'
    },
    {
        name: 'Simple-Script',
        description: 'Rename files helper',
        languages: ['Python'],
        stars: 0,
        url: 'https://github.com/SaadHaider01/simple-script'
    },
    {
        name: 'Static-Portfolio',
        description: 'Static website',
        languages: ['HTML', 'CSS'],
        stars: 1,
        url: 'https://github.com/SaadHaider01/static-portfolio'
    }
];

// Mock repository details for RIE to consume and profile (simulating the crawler finding them)
const mockReposForRIE = [
    {
        name: 'ResumeX',
        languages: ['JavaScript', 'HTML', 'CSS'],
        stars: 15,
        url: 'https://github.com/SaadHaider01/resumex',
        mockTree: [
            'manifest.json',
            'extension/background.js',
            'extension/contentScript.js',
            'extension/formDetector.js',
            'extension/linkedinScraper.js',
            'package.json',
            'README.md'
        ],
        mockFiles: {
            'manifest.json': JSON.stringify({ manifest_version: 3, name: 'ResumeX' }),
            'package.json': JSON.stringify({ dependencies: { express: '^4.18.2', pdfkit: '^0.13.0' } }),
            'README.md': 'ResumeX is a Chrome extension that automates form autofilling and LinkedIn scraping with a backend PDF generation service.'
        }
    },
    {
        name: 'JARVIS',
        languages: ['Python'],
        stars: 8,
        url: 'https://github.com/SaadHaider01/jarvis',
        mockTree: [
            'requirements.txt',
            'main.py',
            'voice_assistant.py',
            'README.md'
        ],
        mockFiles: {
            'requirements.txt': 'openai-whisper\nedge-tts\nopenai',
            'README.md': 'An AI Voice Assistant using Whisper Speech Recognition and Edge Text To Speech.'
        }
    },
    {
        name: 'LInguaVoice',
        languages: ['JavaScript'],
        stars: 5,
        url: 'https://github.com/SaadHaider01/linguavoice',
        mockTree: [
            'package.json',
            'src/App.js',
            'src/components/SpeechHandler.js',
            'README.md'
        ],
        mockFiles: {
            'package.json': JSON.stringify({ dependencies: { react: '^18.2.0' } }),
            'README.md': 'LinguaVoice frontend application utilizing Web Speech APIs for language learning lessons.'
        }
    },
    {
        name: 'Simple-Script',
        languages: ['Python'],
        stars: 0,
        url: 'https://github.com/SaadHaider01/simple-script',
        mockTree: ['rename.py', 'README.md'],
        mockFiles: {
            'README.md': 'Simple Python script to rename files in a folder.'
        }
    },
    {
        name: 'Static-Portfolio',
        languages: ['HTML', 'CSS'],
        stars: 1,
        url: 'https://github.com/SaadHaider01/static-portfolio',
        mockTree: ['index.html', 'style.css', 'README.md'],
        mockFiles: {
            'README.md': 'Static portfolio site.'
        }
    }
];

// ==================== 10 REALISTIC JOB DESCRIPTIONS ====================

const jobDescriptions = [
    {
        role: 'JD 1: Chrome Extension / Browser Automation Engineer',
        jd: 'Seeking a developer to build Chrome Extensions. Must have experience with manifest.json, background service workers, content script DOM manipulation, form autofill mechanics, and scraping.'
    },
    {
        role: 'JD 2: AI Speech & Voice Assistant Engineer',
        jd: 'Looking for a Python Developer experienced with OpenAI API, Whisper Speech Recognition, Text To Speech (TTS), and building AI conversational assistants.'
    },
    {
        role: 'JD 3: Frontend Web Developer',
        jd: 'Required: React, HTML5, CSS3, JavaScript/TypeScript. Build responsive, user-friendly interactive frontend applications.'
    },
    {
        role: 'JD 4: Backend REST API Engineer',
        jd: 'Hiring a Backend Developer to build scalable REST APIs. Must have experience with Express, Node.js, and API routing.'
    },
    {
        role: 'JD 5: Full Stack Web Developer',
        jd: 'Full Stack Engineer with experience in React (frontend) and Node.js/Express (backend) to deploy and scale web applications.'
    },
    {
        role: 'JD 6: DevOps & Automation Engineer',
        jd: 'Seeking an automation specialist to script task workflows and manage deploy scripts. Python or shell scripting, Docker and pipeline automation is a plus.'
    },
    {
        role: 'JD 7: Speech/Audio Processing Developer',
        jd: 'Required: Experience with browser-based Web Speech APIs, SpeechSynthesis, and audio signal parsing/language processing.'
    },
    {
        role: 'JD 8: Language Tech Product Developer',
        jd: 'Build interactive language learning portals. Experience with web speech APIs, language translations, and audio-based interactive lessons.'
    },
    {
        role: 'JD 9: PDF / Document Automation Developer',
        jd: 'Seeking a software engineer to build document generation systems. Must have hands-on experience generating PDF documents dynamically (e.g., pdfkit).'
    },
    {
        role: 'JD 10: Generative AI Integration Specialist',
        jd: 'Integrate LLMs (OpenAI, Gemini API, Claude) into production workflows. Experience with AI SDKs and prompt engineering.'
    }
];

// ==================== RUN COMPARISON ====================

async function runValidation() {
    console.log('🧪 Running Repository Intelligence Engine validation...\n');

    // 1. Generate RIE profiles
    const rieResult = await analyzeRepositories({
        githubUsername: 'SaadHaider01',
        repositories: mockReposForRIE
    });
    const rieProfiles = rieResult.analyzedRepositories;

    const results = [];

    for (const item of jobDescriptions) {
        const parsedJD = parseJobDescription(item.jd);

        // Run old pipeline (raw metadata projects list)
        const oldBlueprint = generateTailoringBlueprint(parsedJD, candidateProfile, { projects: rawGithubProjects });

        // Run new RIE pipeline
        const newBlueprint = generateTailoringBlueprint(parsedJD, candidateProfile, { analyzedRepositories: rieProfiles });

        results.push({
            role: item.role,
            jdText: item.jd,
            old: {
                projects: oldBlueprint.recommendedProjects.map(p => ({
                    name: p.name,
                    relevance: Math.round(p.relevanceScore * 100),
                    matchedSkills: p.matchedSkills,
                    matchedCapabilities: p.matchedCapabilities,
                    explanation: p.explanation
                }))
            },
            new: {
                projects: newBlueprint.recommendedProjects.map(p => ({
                    name: p.name,
                    relevance: Math.round(p.relevanceScore * 100),
                    matchedSkills: p.matchedSkills,
                    matchedCapabilities: p.matchedCapabilities,
                    explanation: p.explanation
                }))
            }
        });
    }

    // Output raw comparison data to console
    results.forEach(res => {
        console.log(`\n======================================================================`);
        console.log(`Role: ${res.role}`);
        console.log(`======================================================================`);
        
        console.log('\n  [OLD METADATA-ONLY PIPELINE]');
        res.old.projects.forEach(p => {
            console.log(`    - Project: ${p.name} (Score: ${p.relevance})`);
            console.log(`      Skills: [${p.matchedSkills.join(', ')}]`);
            console.log(`      Capabilities: [${p.matchedCapabilities.join(', ')}]`);
            console.log(`      Explanation: "${p.explanation}"`);
        });

        console.log('\n  [NEW RIE PIPELINE]');
        res.new.projects.forEach(p => {
            console.log(`    - Project: ${p.name} (Score: ${p.relevance})`);
            console.log(`      Skills: [${p.matchedSkills.join(', ')}]`);
            console.log(`      Capabilities: [${p.matchedCapabilities.join(', ')}]`);
            console.log(`      Explanation: "${p.explanation}"`);
        });
    });

    // Write raw comparison data as a JSON file for analysis
    const fs = require('fs');
    fs.writeFileSync(path.join(__dirname, 'comparison_output.json'), JSON.stringify(results, null, 2));
    console.log(`\n💾 Raw comparison data saved to: ${path.join(__dirname, 'comparison_output.json')}`);
}

runValidation().catch(console.error);
