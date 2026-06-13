/**
 * Resume Output Quality and Evidence Fidelity Test Suite
 * 
 * Runs the ResumeX pipeline across 20 realistic JDs, audits the tailored
 * outputs for hallucinations, BQS, leaks, and evidence utilization, and asserts success criteria.
 * 
 * Run with: node backend/tests/resumeOutputQuality.test.js
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
require('dotenv').config({ path: path.join(__dirname, '../.env'), override: true });

const { generateTailoredResume, trackEvidenceUsage } = require('../services/resumeGenerator');
const { initializeProvider } = require('../services/llmProvider');

// Mock repositories list (RIE source evidence)
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
        if (proj.description) sourceTexts.push(proj.description.toLowerCase());
        if (proj.mockFiles && proj.mockFiles['README.md']) {
            sourceTexts.push(proj.mockFiles['README.md'].toLowerCase());
        }
    });
    
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

    let classification = 'Evidence Supported';
    let reasons = [];

    // Check overlap
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

async function runQualityTestSuite() {
    console.log('🧪 Starting Resume Output Quality Verification Study (20 JDs)...');

    // Deep copy mock profile and enrich with mock projects
    const testProfile = JSON.parse(JSON.stringify(mockUserProfile));
    testProfile.projects = mockRepos;

    const provider = initializeProvider({
        provider: 'openrouter',
        apiKey: process.env.OPENROUTER_API_KEY,
        model: 'openrouter/free'
    });

    const llmCallWrapper = async (prompt) => {
        const completion = await provider.client.chat.completions.create({
            model: provider.defaultModel,
            messages: [
                { role: 'system', content: 'You are an expert resume writer. Always return valid JSON only matching the requested schema.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.1, // low temperature to reduce hallucinations
            max_tokens: 3000
        });

        return completion.choices[0]?.message?.content || '{}';
    };

    const results = [];
    let completionSuccessCount = 0;

    for (let i = 0; i < jobDescriptions.length; i++) {
        const item = jobDescriptions[i];
        console.log(`[${i+1}/20] Running tailored generation for: "${item.role}"`);

        try {
            const output = await generateTailoredResume(item.jd, testProfile, 'SaadHaider01', llmCallWrapper);
            const resume = output.resume;

            const auditedExperiences = [];
            let totalBqs = 0;
            let bulletCount = 0;
            
            if (resume && resume.experience && Array.isArray(resume.experience)) {
                resume.experience.forEach(exp => {
                    const bullets = exp.achievements || exp.bullets || exp.highlights || [];
                    const audited = bullets.map(b => {
                        if (typeof b !== 'string') return null;
                        const audit = auditBulletPoint(b, testProfile);
                        totalBqs += audit.bqs.total;
                        bulletCount++;
                        return audit;
                    }).filter(Boolean);

                    auditedExperiences.push({
                        company: exp.company || '',
                        position: exp.position || '',
                        bullets: audited
                    });
                });
            }

            const auditedProjects = [];
            if (resume && resume.projects && Array.isArray(resume.projects)) {
                resume.projects.forEach(proj => {
                    const bullets = proj.highlights || proj.bullets || proj.achievements || [];
                    const audited = bullets.map(b => {
                        if (typeof b !== 'string') return null;
                        const audit = auditBulletPoint(b, testProfile);
                        totalBqs += audit.bqs.total;
                        bulletCount++;
                        return audit;
                    }).filter(Boolean);

                    auditedProjects.push({
                        name: proj.name || '',
                        bullets: audited
                    });
                });
            }

            const avgBqs = bulletCount > 0 ? Math.round(totalBqs / bulletCount) : 0;
            completionSuccessCount++;

            // Detect Pipeline Data Leaks
            let leakFound = 0;
            const resumeStr = JSON.stringify(resume).toLowerCase();
            const leakKeywords = [
                'confidence', 'confidencescore', 'evidencesources', 
                'evidencetype', 'relevancecore', 'relevancescore', 
                'contradictions', 'architecturepatterns', 'rankingmetadata'
            ];
            leakKeywords.forEach(kw => {
                if (resumeStr.includes(kw)) {
                    leakFound = 1;
                }
            });

            results.push({
                id: item.id,
                category: item.category,
                role: item.role,
                jd: item.jd,
                avgBqs,
                leakFound,
                eurMetrics: output.metadata.eurMetrics,
                evidenceTracker: output.metadata.evidenceTracker,
                resume: {
                    professionalSummary: resume.professionalSummary || '',
                    experience: auditedExperiences,
                    projects: auditedProjects
                }
            });

            console.log(`   └─ Success. BQS: ${avgBqs} | EUR: ${output.metadata.eurMetrics.eur}% | Leaks: ${leakFound}`);

        } catch (err) {
            console.error(`❌ Failed to tailor for ${item.role}:`, err.message);
            results.push({
                id: item.id,
                category: item.category,
                role: item.role,
                jd: item.jd,
                error: err.message
            });
        }

        // Sleep to avoid rate limiting
        await sleep(3000);
    }

    // Write study output
    const studyOutputPath = path.join(__dirname, '../scratch/bullet_validation_output_v2.json');
    fs.writeFileSync(studyOutputPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Saved study outputs to: ${studyOutputPath}`);

    // Compute aggregations
    let totalBullets = 0;
    let supportedCount = 0;
    let inferredCount = 0;
    let hallucinatedCount = 0;
    let bqsSum = 0;
    let totalLeaks = 0;
    
    let totalAvailableEvidence = 0;
    let totalUsedEvidence = 0;

    let duplicateCount = 0;

    const getWordSet = (text) => {
        return new Set(text.toLowerCase().split(/\W+/).filter(w => w.length > 4));
    };

    const isDuplicate = (b1, b2) => {
        const s1 = getWordSet(b1);
        const s2 = getWordSet(b2);
        if (s1.size === 0 || s2.size === 0) return false;
        let intersect = 0;
        s1.forEach(w => { if (s2.has(w)) intersect++; });
        const union = s1.size + s2.size - intersect;
        return (intersect / union) > 0.45;
    };

    results.forEach(res => {
        if (res.error) return;

        totalLeaks += res.leakFound;
        if (res.eurMetrics) {
            totalAvailableEvidence += res.eurMetrics.availableEvidence;
            totalUsedEvidence += res.eurMetrics.usedEvidence;
        }

        const bullets = [];
        const resumeBullets = [];
        res.resume.experience.forEach(exp => {
            (exp.bullets || []).forEach(b => {
                bullets.push(b);
                resumeBullets.push(b.bullet);
            });
        });
        res.resume.projects.forEach(proj => {
            (proj.bullets || []).forEach(b => {
                bullets.push(b);
                resumeBullets.push(b.bullet);
            });
        });

        bullets.forEach(b => {
            totalBullets++;
            bqsSum += b.bqs.total;
            if (b.classification === 'Evidence Supported') supportedCount++;
            else if (b.classification === 'Evidence Inferred') inferredCount++;
            else if (b.classification === 'Potentially Hallucinated') hallucinatedCount++;
        });

        // Check duplicate usage within this individual resume
        for (let i = 0; i < resumeBullets.length; i++) {
            for (let j = i + 1; j < resumeBullets.length; j++) {
                if (isDuplicate(resumeBullets[i], resumeBullets[j])) {
                    duplicateCount++;
                    break;
                }
            }
        }
    });

    const hallucinationRate = totalBullets > 0 ? (hallucinatedCount / totalBullets) * 100 : 0;
    const evidenceSupportedRate = totalBullets > 0 ? (supportedCount / totalBullets) * 100 : 0;
    const evidenceInferredRate = totalBullets > 0 ? (inferredCount / totalBullets) * 100 : 0;
    const avgBqs = totalBullets > 0 ? bqsSum / totalBullets : 0;
    const completionRate = (completionSuccessCount / jobDescriptions.length) * 100;
    const finalEur = totalAvailableEvidence > 0 ? (totalUsedEvidence / totalAvailableEvidence) * 100 : 0;
    const duplicateUsageRate = totalBullets > 0 ? (duplicateCount / totalBullets) * 100 : 0;

    console.log('\n📊 AGGREGATE POST-FIX STUDY METRICS:');
    console.log(`- Total Bullets Audited: ${totalBullets}`);
    console.log(`- Completion Success Rate: ${completionRate.toFixed(1)}%`);
    console.log(`- Hallucination Rate: ${hallucinationRate.toFixed(2)}%`);
    console.log(`- Average Bullet Quality Score (BQS): ${avgBqs.toFixed(1)}`);
    console.log(`- Evidence Supported %: ${evidenceSupportedRate.toFixed(1)}%`);
    console.log(`- Evidence Inferred %: ${evidenceInferredRate.toFixed(1)}%`);
    console.log(`- Evidence Utilization Rate (EUR): ${finalEur.toFixed(1)}%`);
    console.log(`- Pipeline Data Leaks Count: ${totalLeaks}`);
    console.log(`- Duplicate Evidence Usage %: ${duplicateUsageRate.toFixed(1)}%`);

    // Assert targets
    assert.ok(hallucinationRate < 1.0, `Hallucination rate target not met: ${hallucinationRate.toFixed(2)}%`);
    assert.ok(avgBqs > 88.0, `Average BQS target not met: ${avgBqs.toFixed(1)}`);
    assert.ok(evidenceSupportedRate > 55.0, `Evidence supported rate target not met: ${evidenceSupportedRate.toFixed(1)}%`);
    assert.ok(completionRate > 95.0, `Completion success rate target not met: ${completionRate.toFixed(1)}%`);
    assert.ok(totalLeaks === 0, `Pipeline data leaks detected: ${totalLeaks}`);
    assert.ok(finalEur > 70.0, `Evidence utilization rate target not met: ${finalEur.toFixed(1)}%`);
    assert.ok(duplicateUsageRate < 5.0, `Duplicate evidence usage target not met: ${duplicateUsageRate.toFixed(1)}%`);

    console.log('\n🎉 ALL QUALITY TARGETS MET SUCCESSFULLY!');
}

runQualityTestSuite().catch(err => {
    console.error('\n❌ Quality Verification Study Failed:', err.message);
    process.exit(1);
});
