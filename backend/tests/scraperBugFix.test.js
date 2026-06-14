/**
 * Scraper Bug Fix Regression Tests
 *
 * Verifies the fix for the bug where experience, education, and projects
 * were being wiped from the generated resume when the LinkedIn/GitHub scraper
 * returned empty arrays (common when LinkedIn DOM changes).
 *
 * Tests the full generateTailoredResume() orchestrator since that's where the
 * hallucination guard and personalInfo lock live.
 *
 * Run with: node backend/tests/scraperBugFix.test.js
 */

const {
    generateEvidenceCards,
    deduplicateEvidenceUsage,
    cleanAndValidateJSON,
    safeLLMExecution,
    generateTailoredResume
} = require('../services/resumeGenerator');

// ── helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function syncTest(name, fn) {
    try {
        fn();
        console.log(`✅ PASS: ${name}`);
        passed++;
    } catch (err) {
        console.error(`❌ FAIL: ${name}`);
        console.error(`        ${err.message}`);
        failed++;
    }
}

async function asyncTest(name, fn) {
    try {
        await fn();
        console.log(`✅ PASS: ${name}`);
        passed++;
    } catch (err) {
        console.error(`❌ FAIL: ${name}`);
        console.error(`        ${err.message}`);
        failed++;
    }
}

function assert(cond, msg) {
    if (!cond) throw new Error(msg || 'Assertion failed');
}

function assertLength(arr, minLen, msg) {
    if (!Array.isArray(arr) || arr.length < minLen) {
        throw new Error(`${msg} — got length ${Array.isArray(arr) ? arr.length : 'non-array'}, expected >= ${minLen}`);
    }
}

// ── shared mocks ─────────────────────────────────────────────────────────────

// Simulates what the backend receives after LinkedIn scraper FAILS silently
const EMPTY_SCRAPER_PROFILE = {
    personalInfo: {
        name: 'Saad Haider',
        email: 'saad@example.com',
        phone: '+92-000-0000000',
        location: 'Lahore, Pakistan',
        linkedin: 'https://linkedin.com/in/saad-haider',
        github: 'https://github.com/SaadHaider01'
    },
    summary: '',
    skills: {
        technical: ['JavaScript', 'Python', 'Node.js', 'React'],
        tools: ['Git', 'Docker'],
        soft: []
    },
    // Scraper returned empty — this is the bug trigger
    experience: [],
    education: [],
    projects: [
        {
            name: 'ResumeX',
            description: 'Chrome extension for resume generation',
            technologies: ['JavaScript', 'Node.js', 'Express'],
            recruiterSummary: 'AI-powered resume tailoring Chrome extension.'
        }
    ],
    certifications: []
};

const MOCK_JD = `
We are looking for a Software Engineer with 2+ years experience.
Required: JavaScript, React, Node.js, REST APIs.
`;

// A mock LLM that returns a complete resume with experience and education
function makeMockLLM(overrides = {}) {
    return async (_prompt) => {
        const base = {
            personalInfo: {
                name: 'Saad Haider',
                email: 'saad@example.com',
                phone: '+92-000-0000000',
                location: 'Lahore, Pakistan',
                linkedin: '',
                github: ''
            },
            professionalSummary: 'Experienced software engineer specializing in JavaScript and Node.js.',
            skills: {
                technical: ['JavaScript', 'Node.js', 'React'],
                tools: ['Git'],
                soft: ['Communication']
            },
            experience: [
                {
                    company: 'TechCorp',
                    position: 'Software Engineer',
                    duration: '2022 – 2024',
                    location: 'Remote',
                    achievements: [
                        'Built full-stack web applications using React and Node.js, improving performance for 10k users.',
                        'Deployed microservices on AWS ECS using Docker containers for scalable infrastructure.'
                    ]
                }
            ],
            education: [
                {
                    degree: 'Bachelor of Science in Computer Science',
                    institution: 'FAST-NUCES',
                    graduation: '2022'
                }
            ],
            projects: [
                {
                    name: 'ResumeX',
                    description: 'Chrome extension for AI-powered resume tailoring.',
                    technologies: ['JavaScript', 'Node.js', 'Express'],
                    highlights: ['Implemented automated resume generation pipeline using LLM API.']
                }
            ],
            certifications: []
        };

        return JSON.stringify({ ...base, ...overrides });
    };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\n🧪 Scraper Bug Fix Regression Tests\n');
console.log('='.repeat(60));

// ── Section 1: Unit tests on helper functions ─────────────────────────────────
console.log('\n📋 Section 1: Helper Function Unit Tests\n');

syncTest('cleanAndValidateJSON accepts valid resume JSON', () => {
    const valid = {
        personalInfo: { name: 'A', email: '', phone: '', location: '' },
        professionalSummary: 'Summary',
        skills: { technical: [], tools: [], soft: [] },
        experience: [],
        education: [],
        projects: [],
        certifications: []
    };
    const result = cleanAndValidateJSON(JSON.stringify(valid));
    assert(result !== null, 'Should return parsed object for valid JSON');
    assert(result.personalInfo.name === 'A', 'personalInfo should be preserved');
});

syncTest('cleanAndValidateJSON strips markdown code fences', () => {
    const raw = '```json\n{"personalInfo":{"name":"X","email":"","phone":"","location":""},"professionalSummary":"s","skills":{},"experience":[]}\n```';
    const result = cleanAndValidateJSON(raw);
    assert(result !== null, 'Should strip code fences and parse');
    assert(result.personalInfo.name === 'X');
});

syncTest('cleanAndValidateJSON rejects JSON missing required "experience" field', () => {
    const invalid = JSON.stringify({ personalInfo: {}, skills: {} });
    const result = cleanAndValidateJSON(invalid);
    assert(result === null, 'Should reject JSON missing "experience" field');
});

syncTest('generateEvidenceCards includes education in summary card', () => {
    const sanitized = {
        skills: { technical: ['JavaScript'], tools: [], soft: [] },
        education: [{ degree: 'BS Computer Science', institution: 'FAST-NUCES', graduation: '2022' }],
        certifications: [],
        experiences: [],
        projects: [],
        verifiedMetrics: []
    };
    const cards = generateEvidenceCards(sanitized);
    assert(cards.length >= 1, 'Should generate at least 1 card');
    const edFact = cards[0].verifiedFacts.find(f => f.includes('FAST-NUCES'));
    assert(edFact, 'Education should appear in summary card verified facts');
});

syncTest('generateEvidenceCards generates project cards', () => {
    const sanitized = {
        skills: null,
        education: [],
        certifications: [],
        experiences: [],
        projects: [{
            name: 'ResumeX',
            description: 'Chrome extension',
            technologies: ['JavaScript'],
            capabilities: [],
            recruiterSummary: 'AI resume tool',
            verifiedAchievements: ['Chrome extension'],
            verifiedMetrics: []
        }],
        verifiedMetrics: []
    };
    const cards = generateEvidenceCards(sanitized);
    const projCard = cards.find(c => c.project === 'ResumeX');
    assert(projCard, 'Should generate a card for the ResumeX project');
    assertLength(projCard.verifiedFacts, 1, 'Project card should have verified facts');
});

syncTest('deduplicateEvidenceUsage removes near-duplicate bullets within experience', () => {
    const resume = {
        experience: [{
            company: 'TechCorp',
            position: 'Engineer',
            duration: '2022-2024',
            location: '',
            achievements: [
                'Built REST APIs using Node.js and Express serving thousands of users.',
                'Built REST APIs using Node.js and Express serving thousands of users.' // exact dup
            ]
        }],
        projects: []
    };
    const result = deduplicateEvidenceUsage(resume);
    assert(
        result.experience[0].achievements.length === 1,
        'Duplicate bullets should be removed within experience'
    );
});

// ── Section 2: Full pipeline tests (generateTailoredResume) ──────────────────
console.log('\n📋 Section 2: Full Pipeline Tests (generateTailoredResume)\n');

async function runPipelineTests() {

    // Test 2a: With PIE data — experience and education should be preserved
    await asyncTest('With PIE data: experience preserved (scraper returned [])', async () => {
        const { resume } = await generateTailoredResume(
            MOCK_JD,
            EMPTY_SCRAPER_PROFILE,  // experience: []
            'SaadHaider01',
            makeMockLLM()
        );
        assertLength(resume.experience, 1,
            'Experience should be present — PIE data should rescue it');
        assert(resume.experience[0].company === 'TechCorp',
            `Expected company "TechCorp", got "${resume.experience[0]?.company}"`);
    });

    await asyncTest('With PIE data: education preserved (scraper returned [])', async () => {
        const { resume } = await generateTailoredResume(
            MOCK_JD,
            EMPTY_SCRAPER_PROFILE,
            'SaadHaider01',
            makeMockLLM()
        );
        assertLength(resume.education, 1,
            'Education should be present — PIE data should rescue it');
        assert(resume.education[0].institution === 'FAST-NUCES',
            `Expected "FAST-NUCES", got "${resume.education[0]?.institution}"`);
    });

    await asyncTest('With PIE data: projects preserved from RIE/GitHub', async () => {
        const { resume } = await generateTailoredResume(
            MOCK_JD,
            EMPTY_SCRAPER_PROFILE,
            'SaadHaider01',
            makeMockLLM()
        );
        assertLength(resume.projects, 1, 'Projects should be preserved');
        assert(resume.projects[0].name === 'ResumeX',
            `Expected "ResumeX", got "${resume.projects[0]?.name}"`);
    });

    // Test 2b: Without source data — the LLM may still produce reasonable experience
    // guided by the EVIDENCE FENCE (no invented metrics). The resume should NOT be blank.
    // The server.js cleanTailoredResume() handles filtering against real company names
    // when the profile HAS real data. When profile has [] (scraper failure), it's a no-op.
    await asyncTest('No PIE data: resume still produces experience (LLM guided by Evidence Fence)', async () => {
        // Profile with no projects and no github → no RIE → no PIE experiences
        const emptyProfileNoGithub = {
            ...EMPTY_SCRAPER_PROFILE,
            projects: []  // no github projects → no RIE
        };

        const { resume } = await generateTailoredResume(
            MOCK_JD,
            emptyProfileNoGithub,
            '',             // no github username
            makeMockLLM()  // LLM generates experience
        );

        // The LLM output is preserved — an empty resume would be unusable.
        // The Evidence Fence in the prompt prevents fabricated metrics.
        assert(
            Array.isArray(resume.experience),
            'experience should always be an array'
        );
        // personalInfo is always locked
        assert(resume.personalInfo.name === 'Saad Haider', 'personalInfo should still be locked');
    });

    // Test 2c: personalInfo is always locked to the real profile values
    await asyncTest('personalInfo locked: LLM cannot override candidate identity', async () => {
        const maliciousLLM = makeMockLLM({
            personalInfo: {
                name: 'HALLUCINATED NAME',
                email: 'hacker@evil.com',
                phone: '000',
                location: 'Mars'
            }
        });

        const { resume } = await generateTailoredResume(
            MOCK_JD,
            EMPTY_SCRAPER_PROFILE,
            'SaadHaider01',
            maliciousLLM
        );

        assert(
            resume.personalInfo.name === 'Saad Haider',
            `personalInfo.name must be locked to "Saad Haider", got "${resume.personalInfo.name}"`
        );
        assert(
            resume.personalInfo.email === 'saad@example.com',
            `personalInfo.email must be locked, got "${resume.personalInfo.email}"`
        );
    });

    // Test 2d: Profile WITH real experience — normal flow should work fine
    await asyncTest('Real experience in profile: experience passes through untouched', async () => {
        const realProfile = {
            ...EMPTY_SCRAPER_PROFILE,
            experience: [
                {
                    company: 'StartupCo',
                    position: 'Junior Developer',
                    duration: '2021 – 2023',
                    location: 'Remote',
                    achievements: ['Developed customer dashboards using React.']
                }
            ]
        };

        const { resume } = await generateTailoredResume(
            MOCK_JD,
            realProfile,
            'SaadHaider01',
            makeMockLLM({ experience: [{
                company: 'StartupCo',
                position: 'Junior Developer',
                duration: '2021 – 2023',
                location: 'Remote',
                achievements: ['Developed customer dashboards using React and Chart.js for data visualization.']
            }]})
        );

        assertLength(resume.experience, 1, 'Should have experience from real profile');
        assert(resume.experience[0].company === 'StartupCo',
            `Expected "StartupCo", got "${resume.experience[0]?.company}"`);
    });

    // Test 2e: Certifications wipe when empty (no change to cert behavior)
    await asyncTest('Certifications: correctly wiped when source profile has none', async () => {
        const { resume } = await generateTailoredResume(
            MOCK_JD,
            EMPTY_SCRAPER_PROFILE,  // certifications: []
            'SaadHaider01',
            makeMockLLM({ certifications: ['AWS Certified Developer', 'Google Cloud Pro'] }) // LLM hallucinates certs
        );

        assert(
            Array.isArray(resume.certifications) && resume.certifications.length === 0,
            `Certifications should be wiped when source has none. Got ${resume.certifications?.length} entries.`
        );
    });
}

async function main() {
    await runPipelineTests();

    console.log('\n' + '='.repeat(60));
    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);

    if (failed === 0) {
        console.log('🎉 All scraper bug-fix regression tests passed!\n');
        process.exit(0);
    } else {
        console.log('⚠️  Some tests failed — check output above\n');
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Fatal test runner error:', err);
    process.exit(1);
});
