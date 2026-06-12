/**
 * Professional Intelligence Engine (PIE) & Relevance Engine - Test Suite
 */

const assert = require('assert');
const { getCanonicalTech, matchTech } = require('../services/technologySynonyms');
const { analyzeProfessionalProfile, calculateDurationInMonths } = require('../services/professionalIntelligenceService');
const { generateTailoringBlueprint, detectRoleArchetype, allocateBudget } = require('../services/tailoringService');

// ==================== TEST DATA ====================

const mockLinkedInProfile = {
    personalInfo: {
        name: 'Saad Haider',
        email: 'saad.haider@example.com',
        phone: '+1-555-0199',
        location: 'San Francisco, CA'
    },
    rawSkills: ['NodeJS', 'ReactJS', 'AWS', 'Javascript', 'TS', 'Docker', 'K8s', 'Git'],
    experience: [
        {
            company: 'TechCorp Inc.',
            position: 'Senior Software Engineer',
            duration: '1/2021 - Present', // Current environment is June 2026 => 65 months
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
            duration: '6/2019 - 12/2020', // 18 months
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

// ==================== TEST FUNCTIONS ====================

function runTest(name, fn) {
    try {
        fn();
        console.log(`✅ PASS: ${name}`);
        return true;
    } catch (e) {
        console.error(`❌ FAIL: ${name}`);
        console.error(e);
        return false;
    }
}

// 1. Skill Normalization & Synonyms
function testSkillNormalization() {
    assert.strictEqual(getCanonicalTech('NodeJS'), 'Node.js');
    assert.strictEqual(getCanonicalTech('ReactJS'), 'React');
    assert.strictEqual(getCanonicalTech('AWS'), 'AWS');
    assert.strictEqual(getCanonicalTech('Amazon Web Services'), 'AWS');
    assert.strictEqual(getCanonicalTech('js'), 'JavaScript');
    assert.strictEqual(getCanonicalTech('ts'), 'TypeScript');

    assert.ok(matchTech('NodeJS', 'Node.js'));
    assert.ok(matchTech('AWS', 'Amazon Web Services'));
}

// 2. Experience Duration Parsing
function testDurationParsing() {
    // 1/2021 to June 2026 (Present) => 65 months
    const months1 = calculateDurationInMonths('1/2021 - Present');
    assert.strictEqual(months1, 65);

    // 6/2019 to 12/2020 => 18 months
    const months2 = calculateDurationInMonths('6/2019 - 12/2020');
    assert.strictEqual(months2, 18);
}

// 3. PIE Profiling & Seniority
function testPIEProfiling() {
    const pie = analyzeProfessionalProfile({ linkedinProfile: mockLinkedInProfile });
    
    // Check skills normalized
    assert.ok(pie.skills.includes('Node.js'));
    assert.ok(pie.skills.includes('React'));
    assert.ok(pie.skills.includes('AWS'));

    // Check seniority level inference
    assert.strictEqual(pie.experiences[0].seniorityLevel, 'Senior');
    assert.strictEqual(pie.experiences[1].seniorityLevel, 'Intern');

    // Check capability inference
    assert.ok(pie.experiences[0].inferredCapabilities.includes('REST API Development'));
    assert.ok(pie.experiences[0].inferredCapabilities.includes('Frontend Development'));
    assert.ok(pie.experiences[0].inferredCapabilities.includes('Deployment Automation'));
    assert.ok(pie.experiences[1].inferredCapabilities.includes('Browser Automation'));

    // Check capability maturity
    const apiCap = pie.inferredCapabilities.find(c => c.capability === 'REST API Development');
    assert.ok(apiCap);
    assert.strictEqual(apiCap.maturity, 'expert'); // 65 months

    // Check Career DNA dominant domains
    assert.ok(pie.careerSummary.dominantDomains.includes('Full Stack Development'));
    assert.ok(pie.careerSummary.dominantDomains.includes('Browser Automation'));
    assert.ok(pie.careerSummary.confidence >= 0.80);
}

// 4. Role Archetype Detection
function testArchetypeDetection() {
    const jdFrontend = { role: 'Frontend Engineer', skills: ['React', 'CSS'], keywords: ['frontend', 'UI'] };
    assert.strictEqual(detectRoleArchetype(jdFrontend), 'frontend');

    const jdBackend = { role: 'Backend API Developer', skills: ['Node.js', 'Express', 'SQL'], keywords: ['REST API'] };
    assert.strictEqual(detectRoleArchetype(jdBackend), 'backend');

    const jdDevOps = { role: 'DevOps Engineer', skills: ['Docker', 'Kubernetes'], keywords: ['ci/cd', 'deployment'] };
    assert.strictEqual(detectRoleArchetype(jdDevOps), 'devops');
}

// 5. Dynamic Budget Allocation
function testBudgetAllocation() {
    const budget1 = allocateBudget(mockLinkedInProfile, 'frontend');
    assert.strictEqual(budget1.maxExperiences, 3);
    assert.strictEqual(budget1.maxProjects, 3);

    // Adjusting profile projects
    const mockProfileWithProjects = {
        ...mockLinkedInProfile,
        projects: [{}, {}, {}]
    };
    const budget2 = allocateBudget(mockProfileWithProjects, 'chrome_extension');
    assert.strictEqual(budget2.maxProjects, 4);
    assert.strictEqual(budget2.maxExperiences, 2);
}

// 6. Unified Relevance & Justification Report Testing
function testUnifiedBlueprintGeneration() {
    const parsedJD = {
        role: 'Senior React Developer',
        skills: ['React', 'JavaScript', 'HTML5', 'CSS3'],
        experience: '5+ years',
        keywords: ['frontend', 'responsive', 'ui']
    };

    const blueprint = generateTailoringBlueprint(parsedJD, mockLinkedInProfile, { analyzedRepositories: [] });
    
    // Check blueprint outputs
    assert.ok(blueprint.recommendedExperiences.length > 0);
    assert.strictEqual(blueprint.roleArchetype, 'frontend');
    assert.ok(blueprint.justificationReport);
    
    // Check justification report structure
    const report = blueprint.justificationReport;
    assert.ok(Array.isArray(report.included));
    assert.ok(Array.isArray(report.excluded));
    assert.ok(report.reasons.length > 0);
}

// 7. Role-Based Integration Scenarios (5 Roles)
function test5RolesUnifiedScoring() {
    const pieProfile = analyzeProfessionalProfile({ linkedinProfile: mockLinkedInProfile });

    const roles = [
        {
            name: 'Frontend Role',
            jd: { role: 'Frontend Developer', skills: ['React', 'CSS', 'Tailwind'], keywords: ['responsive', 'UI'] },
            expectedTopExp: 'Senior Software Engineer' // matches React/Tailwind
        },
        {
            name: 'Backend Role',
            jd: { role: 'Backend API Engineer', skills: ['Node.js', 'Express', 'MongoDB'], keywords: ['REST API'] },
            expectedTopExp: 'Senior Software Engineer' // matches node/express REST APIs
        },
        {
            name: 'Cloud / DevOps Role',
            jd: { role: 'Cloud Engineer', skills: ['AWS', 'Docker', 'Kubernetes'], keywords: ['infrastructure', 'CI/CD'] },
            expectedTopExp: 'Senior Software Engineer' // matches AWS, Docker, Kubernetes
        },
        {
            name: 'Browser Extensions Role',
            jd: { role: 'Extension Developer', skills: ['JavaScript', 'manifest.json'], keywords: ['form autofill', 'automation'] },
            expectedTopExp: 'Software Developer Intern' // matches manifest.json, Chrome Extension
        },
        {
            name: 'AI Role',
            jd: { role: 'AI Specialist', skills: ['Python', 'OpenAI'], keywords: ['Whisper', 'TTS'] },
            expectedTopExp: 'Senior Software Engineer' // has certifications and tech match
        }
    ];

    roles.forEach(role => {
        const blueprint = generateTailoringBlueprint(role.jd, mockLinkedInProfile, { analyzedRepositories: [] }, pieProfile);
        const topExp = blueprint.recommendedExperiences[0];
        assert.ok(topExp, `Should select a top experience for ${role.name}`);
        assert.strictEqual(topExp.title, role.expectedTopExp, `Top experience for ${role.name} should be ${role.expectedTopExp}`);
    });
}

// ==================== RUN ALL TESTS ====================

console.log('\n🧪 Running Professional Intelligence Engine (PIE) Unit Tests\n');
console.log('='.repeat(60));

let passCount = 0;
let failCount = 0;

const tests = [
    { name: 'Skill Normalization & Synonyms', fn: testSkillNormalization },
    { name: 'Experience Duration Parsing', fn: testDurationParsing },
    { name: 'PIE Profiling & Seniority Inferences', fn: testPIEProfiling },
    { name: 'Role Archetype Detection', fn: testArchetypeDetection },
    { name: 'Dynamic Budget Allocation', fn: testBudgetAllocation },
    { name: 'Unified Blueprint & Justification Reports', fn: testUnifiedBlueprintGeneration },
    { name: 'Unified Scoring Across 5 Roles', fn: test5RolesUnifiedScoring }
];

tests.forEach(test => {
    if (runTest(test.name, test.fn)) {
        passCount++;
    } else {
        failCount++;
    }
});

console.log('='.repeat(60));
console.log(`\n📊 Test Summary: ${passCount} passed, ${failCount} failed\n`);

if (failCount === 0) {
    console.log('🎉 All PIE & Relevance Engine tests passed successfully!\n');
    process.exit(0);
} else {
    console.log('⚠️ Some tests failed!\n');
    process.exit(1);
}
