/**
 * 25-JD Real-World Validation Runner
 * 
 * Generates 25 realistic JDs covering 10 categories, runs the complete ResumeX pipeline
 * (RIE + PIE), calculates the Resume Relevance Score (RRS), and logs justifications.
 * 
 * Run with: node backend/scratch/validation25.js
 */

const fs = require('fs');
const path = require('path');
const { parseJobDescription } = require('../services/jdParser');
const { generateTailoringBlueprint } = require('../services/tailoringService');
const { analyzeRepositories } = require('../services/repositoryIntelligenceService');
const { analyzeProfessionalProfile } = require('../services/professionalIntelligenceService');

// ==================== CANDIDATE DATA ====================

const mockUserProfile = {
    personalInfo: {
        name: 'Saad Haider',
        email: 'saad.haider@example.com',
        phone: '+1-555-0199',
        location: 'San Francisco, CA'
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

// ==================== 25 JOB DESCRIPTIONS ====================

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
    { category: 'Cloud', id: 20, role: 'AWS Serverless Specialist', jd: 'AWS lambda functions, serverless REST APIs, and AWS cloud databases.' },
    // 8. Browser Extensions (2)
    { category: 'Browser Extensions', id: 21, role: 'Chrome Extension Developer', jd: 'Develop Chrome browser extensions. Knowledge of manifest.json, background scripts, content scripts, and DOM scraping.' },
    { category: 'Browser Extensions', id: 22, role: 'Browser Automation Engineer', jd: 'Create browser extensions automating form autofill mechanics, LinkedIn scraping, and DOM inputs.' },
    // 9. Research Platforms (1)
    { category: 'Research Platforms', id: 23, role: 'Interactive Language Lab Developer', jd: 'Interactive learning platforms. Web speech APIs, audio lesson players, and frontend language modules.' },
    // 10. Data Engineering (2)
    { category: 'Data Engineering', id: 24, role: 'Data Pipeline Engineer', jd: 'Build data pipelines. Experience with SQL, Google Data Analytics, reporting dashboards, and ETL pipelines.' },
    { category: 'Data Engineering', id: 25, role: 'Analytics Developer', jd: 'Develop reporting metrics. SQL, database schema design, and data analytics certificates.' }
];

// ==================== VALIDATION EXECUTION ====================

async function runValidation() {
    console.log('🧪 Starting 25-JD Real-World Validation Study...\n');

    // 1. Profile GitHub (RIE)
    const githubResult = await analyzeRepositories({
        githubUsername: 'SaadHaider01',
        repositories: mockRepos
    });
    const repoProfiles = githubResult.analyzedRepositories;

    // 2. Profile LinkedIn (PIE)
    const pieProfile = analyzeProfessionalProfile({
        linkedinProfile: {
            experience: mockUserProfile.experience,
            education: mockUserProfile.education,
            certifications: mockUserProfile.certifications,
            rawSkills: mockUserProfile.skills.linkedinSkills || mockUserProfile.skills.technical || []
        }
    });

    // Merge PIE into user profile
    const finalProfile = JSON.parse(JSON.stringify(mockUserProfile));
    finalProfile.projects = repoProfiles;
    finalProfile.pieResult = pieProfile;

    const validationResults = [];

    // 3. Process JDs
    for (const item of jobDescriptions) {
        const parsedJD = parseJobDescription(item.jd);
        const blueprint = generateTailoringBlueprint(parsedJD, finalProfile, githubResult, pieProfile);

        // Calculate RRS (Resume Relevance Score) - Recruiter Evaluation
        const rrs = evaluateRRS(item.category, blueprint);

        // Identify selections, exclusions, contradictions, DNA influence
        const report = blueprint.justificationReport;
        const contradictions = report.contradictions || [];
        const dominantDNA = blueprint.careerDNA.dominantDomains || [];

        // Cross-evidence check
        const hasReactCrossBoost = repoProfiles.some(p => p.technologies.includes('React')) && 
                                   pieProfile.skills.includes('React');
        const hasAWSCrossBoost = repoProfiles.some(p => p.technologies.includes('AWS')) && 
                                 pieProfile.skills.includes('AWS');

        // Heuristic False Positives / False Negatives (Recruiter perspective)
        const falsePositives = [];
        const falseNegatives = [];
        const rankingMistakes = [];

        if (item.category === 'Backend' && blueprint.recommendedProjects.some(p => p.name === 'Static-Portfolio')) {
            falsePositives.push('Static-Portfolio included in Backend API role');
        }
        if (item.category === 'AI' && !blueprint.recommendedProjects.some(p => p.name === 'JARVIS')) {
            falseNegatives.push('JARVIS excluded in AI role');
        }
        if (item.category === 'Browser Extensions' && blueprint.recommendedExperiences[0]?.title === 'Software Developer Intern') {
            // This is correct (intern matches Chrome Extensions), but if it was not first, that is a ranking mistake
        }

        validationResults.push({
            id: item.id,
            category: item.category,
            role: item.role,
            jd: item.jd,
            archetype: blueprint.roleArchetype,
            rrs: {
                total: rrs.total,
                project: rrs.project,
                experience: rrs.experience,
                certification: rrs.certification,
                skill: rrs.skill,
                alignment: rrs.alignment
            },
            justification: {
                included: report.included.map(i => `${i.type}: ${i.name} (Score: ${Math.round(i.relevanceScore*100)}%)`),
                excluded: report.excluded.map(e => `${e.type}: ${e.name} (Score: ${Math.round(e.relevanceScore*100)}%)`),
                contradictions,
                careerDNA: dominantDNA,
                crossEvidenceBoosts: {
                    react: hasReactCrossBoost,
                    aws: hasAWSCrossBoost,
                    overallBoostApplied: blueprint.careerDNA.confidence >= 0.80
                }
            },
            recruiterAuditing: {
                falsePositives,
                falseNegatives,
                rankingMistakes,
                explanation: `Candidate mapped as "${dominantDNA.join(', ')}" DNA matching target archetype "${blueprint.roleArchetype}". Selection budget applied: ${blueprint.budget.maxExperiences} exp / ${blueprint.budget.maxProjects} projects.`
            }
        });
    }

    // Write validation summary as JSON
    fs.writeFileSync(
        path.join(__dirname, 'validation25_output.json'),
        JSON.stringify(validationResults, null, 2)
    );

    console.log(`💾 Validation output saved to: ${path.join(__dirname, 'validation25_output.json')}`);

    // Print quick summary metrics
    const avgRRS = validationResults.reduce((acc, curr) => acc + curr.rrs.total, 0) / validationResults.length;
    console.log(`\n📊 Validation Summary Metrics:`);
    console.log(`- Average Resume Relevance Score (RRS): ${avgRRS.toFixed(1)} / 100`);
    console.log(`- Total Roles Tailored: ${validationResults.length}`);
    console.log(`- Contradictions Flagged: ${validationResults.reduce((acc, curr) => acc + curr.justification.contradictions.length, 0)}`);
}

/**
 * Recruiter Heuristics for RRS Calculation
 */
function evaluateRRS(category, blueprint) {
    let project = 20;
    let experience = 20;
    let certification = 20;
    let skill = 20;
    let alignment = 20;

    const recProjects = blueprint.recommendedProjects || [];
    const recExperiences = blueprint.recommendedExperiences || [];
    const recCerts = blueprint.recommendedCertifications || [];
    const dna = blueprint.careerDNA;

    // 1. Project Selection evaluation
    if (category === 'Frontend') {
        const hasDashboard = recProjects.some(p => p.name === 'LInguaVoice');
        if (!hasDashboard) project -= 10;
    } else if (category === 'Backend' || category === 'Full Stack') {
        const hasResumeX = recProjects.some(p => p.name === 'ResumeX');
        if (!hasResumeX) project -= 10;
    } else if (category === 'AI' || category === 'ML') {
        const hasJarvis = recProjects.some(p => p.name === 'JARVIS');
        if (!hasJarvis) project -= 10;
    } else if (category === 'Browser Extensions') {
        const hasResumeX = recProjects.some(p => p.name === 'ResumeX');
        if (!hasResumeX) project -= 10;
    }

    // 2. Experience Selection evaluation
    if (category === 'Browser Extensions' || category === 'Research Platforms') {
        // Intern position matches extensions
        const isInternTop = recExperiences[0]?.title.includes('Intern');
        if (!isInternTop) experience -= 5;
    } else {
        // Senior position is far more relevant for Backend/Frontend/Cloud/DevOps/AI/ML
        const isSeniorTop = recExperiences[0]?.title.includes('Senior');
        if (!isSeniorTop) experience -= 15;
    }

    // 3. Certification evaluation
    if (category === 'Cloud' || category === 'DevOps') {
        const hasAWSCert = recCerts.some(c => c.certification.includes('AWS'));
        if (!hasAWSCert) certification -= 10;
    } else if (category === 'Data Engineering') {
        const hasDataCert = recCerts.some(c => c.certification.includes('Data Analytics'));
        if (!hasDataCert) certification -= 10;
    }

    // 4. Skill accuracy
    if (blueprint.matchedSkills.length === 0) {
        skill -= 10;
    }

    // 5. Capability DNA alignment
    if (category === 'Frontend' && !dna.dominantDomains.includes('Full Stack Development')) {
        alignment -= 5;
    }
    if (category === 'AI' && !dna.dominantDomains.includes('AI Applications')) {
        alignment -= 5;
    }

    const total = project + experience + certification + skill + alignment;

    return {
        total,
        project,
        experience,
        certification,
        skill,
        alignment
    };
}

runValidation().catch(console.error);
