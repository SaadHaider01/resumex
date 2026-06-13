/**
 * Real User Profile Quality Test
 *
 * Benchmarks the pipeline using Saad Haider's ACTUAL profile:
 *  - No work experience (experience: [])
 *  - No formal education (education: [])
 *  - No certifications (certifications: [])
 *  - Only skills + GitHub projects (via mockRepos RIE source)
 *
 * This test validates what the extension ACTUALLY produces for the real user,
 * unlike resumeOutputQuality.test.js which uses a rich fictional mock profile.
 *
 * Run with: node backend/tests/realUserProfileTest.js
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
require('dotenv').config({ path: path.join(__dirname, '../.env'), override: true });

const { generateTailoredResume, trackEvidenceUsage } = require('../services/resumeGenerator');
const { initializeProvider } = require('../services/llmProvider');

// ── Real GitHub repositories (as scraped by the extension) ───────────────────
const realGithubProjects = [
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
            'backend/server.js',
            'backend/services/resumeGenerator.js',
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
        name: 'J.A.R.V.I.S',
        languages: ['Python'],
        stars: 8,
        url: 'https://github.com/SaadHaider01/jarvis',
        mockTree: [
            'requirements.txt',
            'main.py',
            'voice_assistant.py',
            'wake_word.py',
            'README.md'
        ],
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
        mockTree: [
            'package.json',
            'src/App.js',
            'src/components/SpeechHandler.js',
            'README.md'
        ],
        mockFiles: {
            'package.json': JSON.stringify({ dependencies: { react: '^18.2.0' } }),
            'README.md': 'A multilingual voice-to-voice translation application using JavaScript and Web Speech API. Supported 12 languages with real-time translation latency under 300ms.'
        }
    }
];

// ── Saad's REAL extension profile (as the extension sends it) ────────────────
const realSaadProfile = {
    personalInfo: {
        name: 'Saad Haider',
        email: 'saadhaider349@gmail.com',
        phone: '6205907774',
        location: '',
        linkedin: 'https://www.linkedin.com/in/saad-haider-455123258',
        github: 'https://github.com/SaadHaider01'
    },
    professionalSummary: 'Full-stack developer with hands-on experience building scalable browser extensions and AI-powered tools. Skilled in JavaScript, TypeScript, and Python, delivering clean, responsive frontend components and robust backend APIs.',
    skills: {
        technical: ['JavaScript', 'TypeScript', 'Python', 'HTML', 'CSS', 'PHP'],
        tools: ['Git', 'GitHub'],
        soft: []
    },
    // Biographical facts — intentionally empty (real state of Saad's profile)
    experience: [],
    education: [],
    projects: realGithubProjects,
    certifications: []
};

// ── 5 representative JDs to test the empty-profile path ─────────────────────
const testJDs = [
    {
        id: 'EP-1',
        role: 'Chrome Extension Developer',
        jd: 'We are seeking a developer to build interactive Chrome extensions. Requirements: manifest.json, background workers, content scripts, form autofill, DOM scraping. Node.js backend, pdfkit, JavaScript, TypeScript.'
    },
    {
        id: 'EP-2',
        role: 'AI Voice Assistant Developer',
        jd: 'Python developer to build voice AI applications. Experience with Whisper Speech-to-Text, Edge TTS, wake-word detection, OpenAI API, and real-time audio pipelines.'
    },
    {
        id: 'EP-3',
        role: 'Full Stack JavaScript Developer',
        jd: 'Build full stack web applications using React, Node.js, Express. Experience with REST APIs, MongoDB, and responsive front-end development.'
    },
    {
        id: 'EP-4',
        role: 'Frontend React Engineer',
        jd: 'Build clean React interfaces. Must know JavaScript, TypeScript, CSS, HTML. Build reusable components and responsive UI.'
    },
    {
        id: 'EP-5',
        role: 'Backend Node.js API Engineer',
        jd: 'Design scalable Node.js/Express backends. REST endpoints, MongoDB schemas, API authentication, and server-side scripting.'
    }
];

const sleep = ms => new Promise(res => setTimeout(res, ms));

// ── Audit a bullet point against only what the profile actually contains ─────
function auditBulletAgainstRealProfile(bullet, profile) {
    const text = bullet.toLowerCase();
    const sourceTexts = [];

    // Only projects are available as evidence (no experience/education)
    (profile.projects || []).forEach(proj => {
        if (proj.description) sourceTexts.push(proj.description.toLowerCase());
        if (proj.mockFiles && proj.mockFiles['README.md']) {
            sourceTexts.push(proj.mockFiles['README.md'].toLowerCase());
        }
        (proj.highlights || []).forEach(h => sourceTexts.push(h.toLowerCase()));
    });

    const metricMatches = bullet.match(/\b\d+%\b|\b\d+m\b|\b\d+k\b|\$\d+/gi);
    // Only the documented "300ms" metric from LInguaVoice README is legitimate
    const allowedMetrics = ['300ms', '300'];

    let isMetricHallucinated = false;
    const inventedMetrics = [];
    if (metricMatches) {
        metricMatches.forEach(m => {
            if (!allowedMetrics.some(am => m.toLowerCase().includes(am))) {
                isMetricHallucinated = true;
                inventedMetrics.push(m);
            }
        });
    }

    // Check for fabricated experience (companies the user never worked at)
    const forbiddenCompanies = [
        'techcorp', 'startupxyz', 'devolutions', 'startup llc',
        'university of california', 'amazon web services'
    ];
    const hasFabricatedCompany = forbiddenCompanies.some(fc => text.includes(fc));

    let classification = 'Evidence Supported';
    const reasons = [];

    if (isMetricHallucinated) {
        classification = 'Potentially Hallucinated';
        reasons.push(`Invented metric: ${inventedMetrics.join(', ')}`);
    }
    if (hasFabricatedCompany) {
        classification = 'Mock Data Leak';
        reasons.push('Contains fabricated company/institution from mockData.js');
    }

    // BQS scoring
    let relevance = 25, specificity = 25, verifiability = 25, impact = 25;
    if (isMetricHallucinated) verifiability -= 20;
    if (hasFabricatedCompany) { verifiability -= 25; impact -= 25; }
    if (!text.match(/\b(built|developed|implemented|designed|created|optimized|integrated|engineered)\b/i)) impact -= 10;
    if (text.length < 30) { specificity -= 15; impact -= 10; }
    const bqs = Math.max(0, relevance + specificity + verifiability + impact);

    return {
        bullet,
        classification,
        bqs: { total: bqs, relevance, specificity, verifiability, impact },
        reasons
    };
}

async function runRealUserProfileTest() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🧪 Real User Profile Quality Test (Empty Experience/Education)');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('Profile: Saad Haider | experience: [] | education: [] | certifications: []');
    console.log(`Projects available: ${realSaadProfile.projects.map(p => p.name).join(', ')}\n`);

    const provider = initializeProvider({
        provider: process.env.LLM_PROVIDER || 'openrouter',
        apiKey: process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY,
        model: process.env.OPENROUTER_MODEL || 'openrouter/free'
    });

    const llmCallWrapper = async (prompt) => {
        const result = await provider.generateText(prompt, {
            temperature: 0.1,
            maxTokens: 3000,
            responseFormat: 'json',
            systemPrompt: 'You are an expert resume writer. Always return valid JSON only matching the requested schema.'
        });
        return result.text;
    };

    const results = [];
    let mockDataLeakCount = 0;
    let fabricatedExperienceCount = 0;
    let totalBullets = 0;
    let hallucinatedCount = 0;
    let bqsSum = 0;
    let completionCount = 0;

    for (let i = 0; i < testJDs.length; i++) {
        const item = testJDs[i];
        console.log(`[${i + 1}/${testJDs.length}] Testing: "${item.role}" (${item.id})`);

        try {
            const output = await generateTailoredResume(item.jd, realSaadProfile, 'SaadHaider01', llmCallWrapper);
            const resume = output.resume;
            completionCount++;

            // ── CHECK 1: No mock data in personal info ─────────────────────
            const resumeStr = JSON.stringify(resume).toLowerCase();
            const mockCompanies = ['techcorp', 'startupxyz', 'devolutions', 'university of california', 'alex johnson'];
            const leaksFound = mockCompanies.filter(mc => resumeStr.includes(mc));

            if (leaksFound.length > 0) {
                mockDataLeakCount++;
                console.log(`   ⚠️  MOCK DATA LEAK: Found "${leaksFound.join('", "')}" in resume`);
            }

            // ── CHECK 2: Experience section should be empty (user has none) ─
            const experienceCount = (resume.experience || []).length;
            if (experienceCount > 0) {
                // Check if these are fabricated companies
                (resume.experience || []).forEach(exp => {
                    if (exp.company && mockCompanies.some(mc => exp.company.toLowerCase().includes(mc))) {
                        fabricatedExperienceCount++;
                        console.log(`   ❌  FABRICATED EXPERIENCE: "${exp.company}" — user never worked here`);
                    }
                });
            }

            // ── CHECK 3: Projects should only contain Saad's real repos ────
            const realProjectNames = realSaadProfile.projects.map(p => p.name.toLowerCase());
            const invalidProjects = (resume.projects || []).filter(p => {
                const pName = (p.name || '').toLowerCase();
                return !realProjectNames.some(rn =>
                    pName.includes(rn.replace(/[^a-z0-9]/g, '')) ||
                    rn.replace(/[^a-z0-9]/g, '').includes(pName.replace(/[^a-z0-9]/g, ''))
                );
            });
            if (invalidProjects.length > 0) {
                console.log(`   ⚠️  INVALID PROJECTS: ${invalidProjects.map(p => p.name).join(', ')}`);
            }

            // ── CHECK 4: Personal info correctness ──────────────────────────
            const nameCorrect = (resume.personalInfo?.name || '').toLowerCase().includes('saad');
            if (!nameCorrect) {
                console.log(`   ❌  WRONG NAME: "${resume.personalInfo?.name}" — expected Saad Haider`);
            }

            // ── Audit bullets ────────────────────────────────────────────────
            const bullets = [];
            (resume.experience || []).forEach(exp => {
                (exp.achievements || []).forEach(b => {
                    if (typeof b === 'string') {
                        bullets.push(auditBulletAgainstRealProfile(b, realSaadProfile));
                    }
                });
            });
            (resume.projects || []).forEach(proj => {
                (proj.highlights || []).forEach(b => {
                    if (typeof b === 'string') {
                        bullets.push(auditBulletAgainstRealProfile(b, realSaadProfile));
                    }
                });
            });

            bullets.forEach(b => {
                totalBullets++;
                bqsSum += b.bqs.total;
                if (b.classification === 'Potentially Hallucinated' || b.classification === 'Mock Data Leak') {
                    hallucinatedCount++;
                }
            });

            const avgBqs = bullets.length > 0 ? Math.round(bqsSum / bullets.length) : 0;

            results.push({
                id: item.id,
                role: item.role,
                success: true,
                nameCorrect,
                experienceCount,
                projectCount: (resume.projects || []).length,
                leaksFound,
                invalidProjects: invalidProjects.map(p => p.name),
                avgBqs,
                eurMetrics: output.metadata.eurMetrics,
                diagnostics: output.metadata.diagnostics,
                personalInfo: resume.personalInfo
            });

            console.log(`   └─ ✅ Done | Name OK: ${nameCorrect} | Exp: ${experienceCount} | Projects: ${resume.projects?.length || 0} | BQS: ${avgBqs} | Leaks: ${leaksFound.length}`);

        } catch (err) {
            console.error(`   └─ ❌ Failed: ${err.message}`);
            results.push({ id: item.id, role: item.role, success: false, error: err.message });
        }

        await sleep(3000);
    }

    // ── Save results ──────────────────────────────────────────────────────────
    const outputPath = path.join(__dirname, '../scratch/real_user_profile_test_output.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Saved results to: ${outputPath}`);

    // ── Print aggregate report ────────────────────────────────────────────────
    const hallucinationRate = totalBullets > 0 ? (hallucinatedCount / totalBullets) * 100 : 0;
    const avgBqsOverall = totalBullets > 0 ? bqsSum / totalBullets : 0;
    const completionRate = (completionCount / testJDs.length) * 100;

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 REAL USER PROFILE TEST — AGGREGATE RESULTS');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Completion Rate:           ${completionRate.toFixed(1)}%`);
    console.log(`Mock Data Leaks:           ${mockDataLeakCount} resumes affected`);
    console.log(`Fabricated Experiences:    ${fabricatedExperienceCount}`);
    console.log(`Total Bullets Audited:     ${totalBullets}`);
    console.log(`Hallucination Rate:        ${hallucinationRate.toFixed(2)}%`);
    console.log(`Average BQS (projects):    ${avgBqsOverall.toFixed(1)}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // ── Assertions ────────────────────────────────────────────────────────────
    assert.strictEqual(mockDataLeakCount, 0,
        `❌ Mock data leak detected in ${mockDataLeakCount} resume(s). Fix A is required.`);

    assert.strictEqual(fabricatedExperienceCount, 0,
        `❌ Fabricated experience sections in ${fabricatedExperienceCount} resume(s). Real user has no work history.`);

    assert.ok(completionRate >= 80,
        `❌ Completion rate ${completionRate.toFixed(1)}% is below 80% — pipeline is failing for sparse profiles.`);

    assert.ok(hallucinationRate < 5.0,
        `❌ Hallucination rate ${hallucinationRate.toFixed(2)}% is too high for sparse profiles.`);

    console.log('🎉 ALL REAL USER PROFILE ASSERTIONS PASSED!\n');
}

runRealUserProfileTest().catch(err => {
    console.error('\n❌ Real User Profile Test Failed:', err.message);
    process.exit(1);
});
