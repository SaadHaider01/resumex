/**
 * 20-JD Resume Output Quality Study Runner (Offline Repositories Version)
 * 
 * Runs the full ResumeX pipeline for 20 JDs, calls the OpenRouter LLM,
 * and audits every generated experience and project bullet point.
 * 
 * Run with: node backend/scratch/bulletValidation20.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), override: true });
const { generateTailoredResume } = require('../services/resumeGenerator');
const { initializeProvider } = require('../services/llmProvider');
const { analyzeRepositories } = require('../services/repositoryIntelligenceService');

// Ensure provider works
const provider = initializeProvider({
    provider: 'openrouter',
    apiKey: process.env.OPENROUTER_API_KEY,
    model: 'openrouter/free'
});

// Mock repositories list
const mockRepos = [
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

// Candidate Mock Profile
const mockUserProfile = {
    personalInfo: {
        name: 'Saad Haider',
        email: 'saad.haider@example.com',
        phone: '+1-555-0199',
        location: 'San Francisco, CA',
        github: 'github.com/SaadHaider01'
    },
    skills: {
        technical: ['JavaScript', 'TypeScript', 'Python', 'HTML5', 'CSS3'],
        tools: ['Git', 'GitHub', 'Docker', 'Kubernetes'],
        soft: ['collaboration', 'communication']
    },
    totalExperience: '7 years',
    experience: [
        {
            company: 'TechCorp Inc.',
            position: 'Senior Software Engineer',
            duration: '1/2021 - Present',
            location: 'San Francisco, CA',
            achievements: [
                'Led development of REST API microservices serving 1M+ users',
                'Built responsive frontend modules using React and Tailwind',
                'Managed AWS cloud deployments and CI/CD pipelines'
            ]
        },
        {
            company: 'Startup LLC',
            position: 'Software Developer Intern',
            duration: '6/2019 - 12/2020',
            location: 'Remote',
            achievements: [
                'Created node.js backend scripts and designed MongoDB database schemas',
                'Built Chrome Extension prototype with manifest.json for form autofill automation'
            ]
        }
    ],
    certifications: [
        'AWS Certified Solutions Architect',
        'Google Data Analytics Certificate'
    ],
    education: [
        {
            degree: 'Bachelor of Science in Computer Science',
            institution: 'State University',
            graduation: '2019'
        }
    ]
};

// 20 Job Descriptions across 7 categories
const jobDescriptions = [
    // 1. Frontend (2)
    { category: 'Frontend', id: 1, role: 'React Frontend Engineer', jd: 'Build clean React interfaces. Must know React, JavaScript, CSS, HTML5, UI responsive styling.' },
    { category: 'Frontend', id: 2, role: 'Senior UI Developer', jd: 'Lead frontend architecture. Required: React, Tailwind CSS, TypeScript, and state management.' },
    // 2. Backend (3)
    { category: 'Backend', id: 3, role: 'REST API Node.js Engineer', jd: 'Design scalable backends. Experience with Express, Node.js, routing, and REST endpoints.' },
    { category: 'Backend', id: 4, role: 'Database API Engineer', jd: 'Scalable backend engineer focusing on MongoDB, PostgreSQL schema design, Express, and performance.' },
    { category: 'Backend', id: 5, role: 'Backend Software Architect', jd: 'Architecture of API microservices using Node.js, Redis, and distributed message queues.' },
    // 3. Full Stack (3)
    { category: 'Full Stack', id: 6, role: 'Full Stack Engineer', jd: 'Develop full stack apps using React (frontend) and Node.js/Express (backend).' },
    { category: 'Full Stack', id: 7, role: 'Full Stack Tech Lead', jd: 'Lead full stack engineering team. Modern JS/TS frameworks, React, Express, database design, and cloud deployments.' },
    { category: 'Full Stack', id: 8, role: 'Product Software Developer', jd: 'General full-stack developer experienced in web applications, user interfaces, APIs, and agile practices.' },
    // 4. AI (3)
    { category: 'AI', id: 9, role: 'Generative AI Developer', jd: 'Build AI applications with LLMs. Experience with OpenAI API, Prompt engineering, and Python.' },
    { category: 'AI', id: 10, role: 'Speech AI Integration Specialist', jd: 'Looking for a Python developer experienced with Whisper Speech-to-Text and TTS conversions.' },
    { category: 'AI', id: 11, role: 'AI Conversational Agent Developer', jd: 'Develop AI assistants using speech recognition, text-to-speech, and OpenAI conversational frameworks.' },
    // 5. ML (3)
    { category: 'ML', id: 12, role: 'Machine Learning Engineer', jd: 'Implement machine learning models. Required: Python, deep learning frameworks, and data preprocessing.' },
    { category: 'ML', id: 13, role: 'Speech Recognition ML Engineer', jd: 'Develop custom STT and speech models using Whisper, Python, and speech signals processing.' },
    { category: 'ML', id: 14, role: 'Audio DSP / ML Specialist', jd: 'Apply ML to audio signals and speech synthesis. Python, text-to-speech, and signal parsing.' },
    // 6. DevOps (3)
    { category: 'DevOps', id: 15, role: 'DevOps & CI/CD Engineer', jd: 'Manage CI/CD pipeline automation, script workflows, Docker, Kubernetes, and GitLab.' },
    { category: 'DevOps', id: 16, role: 'Site Reliability Engineer', jd: 'Ensure system uptime. Automation scripting, Kubernetes, Docker, container monitoring, and cloud configuration.' },
    { category: 'DevOps', id: 17, role: 'Automation Specialist', jd: 'Seeker of automation scripting. Python scripting, cron workflows, task automation, and docker deploy scripts.' },
    // 7. Cloud (3)
    { category: 'Cloud', id: 18, role: 'Cloud Solutions Architect', jd: 'Design scalable cloud architecture on AWS. Experience with AWS EC2, S3, IAM, and Solutions Architect certifications.' },
    { category: 'Cloud', id: 19, role: 'Cloud Infrastructure Developer', jd: 'Deploy applications on AWS. Knowledge of Docker, Kubernetes, Terraform, and cloud-native architecture.' },
    { category: 'Cloud', id: 20, role: 'AWS Serverless Specialist', jd: 'AWS lambda functions, serverless REST APIs, and AWS cloud databases.' }
];

// Helper to check for delay
const sleep = ms => new Promise(res => setTimeout(res, ms));

// Auditing function
function auditBulletPoint(bullet, sourceProfile) {
    const text = bullet.toLowerCase();
    
    // Original achievements words for checking
    const sourceTexts = [];
    sourceProfile.experience.forEach(exp => {
        exp.achievements.forEach(a => sourceTexts.push(a.toLowerCase()));
    });
    sourceProfile.projects.forEach(proj => {
        // Also check if matches project summary
        if (proj.description) {
            sourceTexts.push(proj.description.toLowerCase());
        }
        if (proj.mockFiles && proj.mockFiles['README.md']) {
            sourceTexts.push(proj.mockFiles['README.md'].toLowerCase());
        }
    });
    
    // Original metrics in profile
    const originalMetrics = ['1m+', '1 million', '7 years'];
    
    // Check if bullet has metrics
    const metricMatches = bullet.match(/\b\d+%\b|\b\d+m\b|\b\d+k\b|\$\d+/gi);
    
    let isMetricHallucinated = false;
    let inventedMetricsList = [];
    if (metricMatches) {
        metricMatches.forEach(m => {
            const mClean = m.toLowerCase();
            if (!originalMetrics.some(om => om.includes(mClean) || mClean.includes(om))) {
                isMetricHallucinated = true;
                inventedMetricsList.push(m);
            }
        });
    }

    // Classify evidence alignment
    let classification = 'Evidence Supported';
    let reasons = [];

    // Check overlaps
    let directOverlap = false;
    sourceTexts.forEach(st => {
        const stWords = st.split(/\W+/).filter(w => w.length > 4);
        const bulletWords = text.split(/\W+/).filter(w => w.length > 4);
        const intersection = stWords.filter(w => bulletWords.includes(w));
        if (intersection.length >= 3) {
            directOverlap = true;
        }
    });

    if (isMetricHallucinated) {
        classification = 'Potentially Hallucinated';
        reasons.push(`Contains invented metric: ${inventedMetricsList.join(', ')}`);
    } else if (directOverlap) {
        classification = 'Evidence Supported';
    } else {
        classification = 'Evidence Inferred';
    }

    // Heuristics for errors
    const errors = {
        generic: false,
        repetitive: false,
        unsupported: false,
        inventedMetric: isMetricHallucinated
    };

    if (text.includes('responsible for') || text.includes('assisted in') || text.includes('worked on tasks') || text.length < 30) {
        errors.generic = true;
    }

    if (text.includes('led a team of') || text.includes('managed project budget') || text.includes('architected ios') || text.includes('senior cloud developer at startup llc')) {
        errors.unsupported = true;
        classification = 'Potentially Hallucinated';
        reasons.push('Unsupported claim of leadership/scope/scale');
    }

    // Calculate BQS
    let relevance = 25;
    let specificity = 25;
    let verifiability = 25;
    let impact = 25;

    if (errors.generic) {
        specificity -= 15;
        impact -= 15;
    }
    if (classification === 'Potentially Hallucinated') {
        verifiability -= 20;
    } else if (classification === 'Evidence Inferred') {
        verifiability -= 5;
    }
    if (!text.match(/\b(led|built|developed|optimized|managed|created|architected|designed|implemented)\b/i)) {
        impact -= 10;
    }
    if (!text.match(/\b(users|scale|percent|%|performance|speed|deploy|pipeline|reduction|improvement)\b/i)) {
        impact -= 10;
    }

    const bqs = relevance + specificity + verifiability + impact;

    return {
        bullet,
        classification,
        bqs: {
            total: bqs,
            relevance,
            specificity,
            verifiability,
            impact
        },
        errors,
        reasons
    };
}

async function runOutputQualityStudy() {
    console.log('🧪 Starting Resume Output Quality Study (20 JDs)...');

    // Step 0: Set raw mock projects so tailoring service profiles them dynamically
    mockUserProfile.projects = mockRepos;

    const results = [];

    const llmCallWrapper = async (prompt) => {
        const completion = await provider.client.chat.completions.create({
            model: provider.defaultModel,
            messages: [
                { role: 'system', content: 'You are an expert resume writer. Always return valid JSON only matching the requested schema.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 3500
        });

        let text = completion.choices[0]?.message?.content || '{}';
        text = text.trim();
        if (text.startsWith('```json')) {
            text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (text.startsWith('```')) {
            text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        text = text.trim();
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error('Failed to parse JSON response. Raw output:', text);
            return {};
        }
    };

    for (let i = 0; i < jobDescriptions.length; i++) {
        const item = jobDescriptions[i];
        console.log(`[${i+1}/20] Tailoring for category: "${item.category}" | Role: "${item.role}"`);

        try {
            const output = await generateTailoredResume(item.jd, mockUserProfile, 'SaadHaider01', llmCallWrapper);
            const resume = output.resume;

            const auditedExperiences = [];
            let totalBqs = 0;
            let bulletCount = 0;
            
            if (resume && resume.experience && Array.isArray(resume.experience)) {
                resume.experience.forEach(exp => {
                    if (exp && typeof exp === 'object') {
                        const bullets = exp.achievements || exp.bullets || exp.highlights || [];
                        if (Array.isArray(bullets)) {
                            const audited = bullets.map(b => {
                                if (typeof b !== 'string') return null;
                                const audit = auditBulletPoint(b, mockUserProfile);
                                totalBqs += audit.bqs.total;
                                bulletCount++;
                                return audit;
                            }).filter(Boolean);
                            auditedExperiences.push({
                                company: exp.company || '',
                                position: exp.position || exp.title || '',
                                bullets: audited
                            });
                        }
                    }
                });
            }

            const auditedProjects = [];
            if (resume && resume.projects && Array.isArray(resume.projects)) {
                resume.projects.forEach(proj => {
                    if (proj && typeof proj === 'object') {
                        const bullets = proj.highlights || proj.bullets || proj.achievements || [];
                        if (Array.isArray(bullets)) {
                            const audited = bullets.map(b => {
                                if (typeof b !== 'string') return null;
                                const audit = auditBulletPoint(b, mockUserProfile);
                                totalBqs += audit.bqs.total;
                                bulletCount++;
                                return audit;
                            }).filter(Boolean);
                            auditedProjects.push({
                                name: proj.name || '',
                                bullets: audited
                            });
                        }
                    }
                });
            }

            const avgBqs = bulletCount > 0 ? Math.round(totalBqs / bulletCount) : 0;

            results.push({
                id: item.id,
                category: item.category,
                role: item.role,
                jd: item.jd,
                avgBqs,
                resume: {
                    professionalSummary: resume.professionalSummary,
                    experience: auditedExperiences,
                    projects: auditedProjects
                }
            });

            console.log(`   └─ Tailored Successfully. Avg BQS: ${avgBqs} | Bullets audited: ${bulletCount}`);

        } catch (err) {
            console.error(`❌ Failed to tailor for ${item.role}:`, err);
        }

        await sleep(2500);
    }

    const outputPath = path.join(__dirname, 'bullet_validation_output.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Saved detailed validation outputs to: ${outputPath}`);

    // Compute aggregate metrics
    let totalBullets = 0;
    let supportedCount = 0;
    let inferredCount = 0;
    let hallucinatedCount = 0;
    
    let genericCount = 0;
    let weakCount = 0;
    let repetitiveCount = 0;
    let unsupportedCount = 0;
    let inventedMetricCount = 0;

    let bqsSum = 0;

    results.forEach(res => {
        const process = (bullets) => {
            bullets.forEach(b => {
                totalBullets++;
                bqsSum += b.bqs.total;
                if (b.classification === 'Evidence Supported') supportedCount++;
                else if (b.classification === 'Evidence Inferred') inferredCount++;
                else if (b.classification === 'Potentially Hallucinated') hallucinatedCount++;

                if (b.errors.generic) genericCount++;
                if (b.bqs.total < 70) weakCount++;
                if (b.errors.unsupported) unsupportedCount++;
                if (b.errors.inventedMetric) inventedMetricCount++;
            });
        };
        res.resume.experience.forEach(exp => process(exp.bullets || []));
        res.resume.projects.forEach(proj => process(proj.bullets || []));
    });

    const overallAvgBqs = totalBullets > 0 ? (bqsSum / totalBullets).toFixed(1) : 0;

    console.log('\n📊 AGGREGATE STUDY METRICS:');
    console.log(`- Total Bullets Audited: ${totalBullets}`);
    console.log(`- Overall Average Bullet Quality Score (BQS): ${overallAvgBqs} / 100`);
    console.log(`- Evidence Supported: ${supportedCount} (${(supportedCount/totalBullets*100).toFixed(1)}%)`);
    console.log(`- Evidence Inferred: ${inferredCount} (${(inferredCount/totalBullets*100).toFixed(1)}%)`);
    console.log(`- Potentially Hallucinated: ${hallucinatedCount} (${(hallucinatedCount/totalBullets*100).toFixed(1)}%)`);
    
    console.log(`\n🚨 AUDIT ERRORS DETECTED:`);
    console.log(`- Generic Bullets: ${genericCount}`);
    console.log(`- Weak Bullets (<70 BQS): ${weakCount}`);
    console.log(`- Unsupported Claims: ${unsupportedCount}`);
    console.log(`- Invented Metrics (Hallucinations): ${inventedMetricCount}`);
}

runOutputQualityStudy().catch(console.error);
