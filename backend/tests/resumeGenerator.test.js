/**
 * Resume Generator Tests
 * 
 * Tests for the full pipeline integration:
 * JD → Parser → GitHub → Tailoring → AI Generator
 */

const { parseJobDescription } = require('../services/jdParser');
const { generateTailoringBlueprint } = require('../services/tailoringService');
const { createResumePrompt } = require('../promptTemplate');

// ==================== TEST DATA ====================

const mockJD = `
We are looking for a Senior Full-Stack Developer with 5+ years of experience.

Required Skills:
- React, Node.js, TypeScript
- MongoDB, PostgreSQL
- Docker, Kubernetes
- AWS or Azure

Responsibilities:
- Build scalable REST APIs
- Develop responsive web applications
- Work with cross-functional teams
- Mentor junior developers
`;

const mockUserProfile = {
    personalInfo: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1-234-567-8900',
        location: 'San Francisco, CA'
    },
    skills: ['React', 'Node.js', 'JavaScript', 'MongoDB', 'Express'],
    totalExperience: '6 years',
    experience: [
        {
            company: 'Tech Corp',
            position: 'Full-Stack Developer',
            duration: '2020 - Present',
            achievements: [
                'Built REST APIs serving 1M+ users',
                'Reduced load time by 40%'
            ]
        }
    ],
    education: [
        {
            degree: 'BS Computer Science',
            institution: 'University of Technology',
            graduation: '2017'
        }
    ]
};

const mockGithubProfile = {
    topLanguages: ['JavaScript', 'TypeScript', 'Python'],
    projects: [
        {
            name: 'E-commerce API',
            description: 'Scalable REST API with Node.js and MongoDB',
            languages: ['JavaScript', 'Node.js', 'MongoDB'],
            stars: 45,
            url: 'https://github.com/user/ecommerce'
        },
        {
            name: 'React Dashboard',
            description: 'Analytics dashboard with real-time updates',
            languages: ['React', 'TypeScript'],
            stars: 23,
            url: 'https://github.com/user/dashboard'
        }
    ],
    stats: {
        totalRepos: 15,
        totalStars: 78,
        totalCommits: 524
    }
};

// ==================== TEST UTILITIES ====================

function runTest(testName, testFn) {
    try {
        testFn();
        console.log(`✅ PASS: ${testName}`);
        return true;
    } catch (error) {
        console.error(`❌ FAIL: ${testName}`);
        console.error(`   Error: ${error.message}`);
        return false;
    }
}

function assertTrue(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function assertContains(str, substring, message) {
    if (!str.includes(substring)) {
        throw new Error(`${message}\n   Expected to contain: "${substring}"\n   Actual: "${str.substring(0, 200)}..."`);
    }
}

function assertGreaterThan(actual, threshold, message) {
    if (actual <= threshold) {
        throw new Error(`${message}\n   Expected: > ${threshold}\n   Actual: ${actual}`);
    }
}

// ==================== TESTS ====================

function testFullPipelineIntegration() {
    // Step 1: Parse JD
    const parsedJD = parseJobDescription(mockJD);
    assertTrue(parsedJD.skills.length > 0, 'Should parse skills from JD');

    // Step 2: Generate blueprint
    const blueprint = generateTailoringBlueprint(parsedJD, mockUserProfile, mockGithubProfile);
    assertTrue(blueprint.matchedSkills.length > 0, 'Should have matched skills');
    assertTrue(blueprint.recommendedProjects.length > 0, 'Should have recommended projects');

    // Step 3: Create prompt
    const prompt = createResumePrompt(mockJD, mockUserProfile, blueprint);
    assertTrue(typeof prompt === 'string', 'Should generate prompt string');
    assertGreaterThan(prompt.length, 500, 'Prompt should be substantial');
}

function testBlueprintInjectionInPrompt() {
    const parsedJD = parseJobDescription(mockJD);
    const blueprint = generateTailoringBlueprint(parsedJD, mockUserProfile, mockGithubProfile);
    const prompt = createResumePrompt(mockJD, mockUserProfile, blueprint);

    // Verify blueprint signals are injected
    assertContains(prompt, 'TAILORING INTELLIGENCE', 'Should include tailoring intelligence section');
    assertContains(prompt, 'MATCHED SKILLS', 'Should include matched skills section');
    assertContains(prompt, 'MISSING SKILLS', 'Should include missing skills section');
    assertContains(prompt, 'RECOMMENDED PROJECTS', 'Should include recommended projects section');
    assertContains(prompt, 'KEYWORD INJECTION LIST', 'Should include keyword injection list');
    assertContains(prompt, 'EXPERIENCE MATCH LEVEL', 'Should include experience match level');
}

function testMatchedSkillsHighlighting() {
    const parsedJD = parseJobDescription(mockJD);
    const blueprint = generateTailoringBlueprint(parsedJD, mockUserProfile, mockGithubProfile);
    const prompt = createResumePrompt(mockJD, mockUserProfile, blueprint);

    // Verify matched skills are present in prompt
    blueprint.matchedSkills.forEach(skill => {
        assertContains(
            prompt.toLowerCase(),
            skill.toLowerCase(),
            `Matched skill "${skill}" should be in prompt`
        );
    });
}

function testRecommendedProjectsPrioritization() {
    const parsedJD = parseJobDescription(mockJD);
    const blueprint = generateTailoringBlueprint(parsedJD, mockUserProfile, mockGithubProfile);
    const prompt = createResumePrompt(mockJD, mockUserProfile, blueprint);

    // Verify recommended projects are mentioned with relevance scores
    assertTrue(
        blueprint.recommendedProjects.length > 0,
        'Should have recommended projects'
    );

    blueprint.recommendedProjects.forEach(project => {
        assertContains(
            prompt,
            project.name,
            `Recommended project "${project.name}" should be in prompt`
        );
        assertContains(
            prompt,
            'Relevance:',
            'Should show relevance scores for projects'
        );
    });
}

function testExperienceLevelToneAdjustment() {
    const parsedJD = parseJobDescription(mockJD);
    const blueprint = generateTailoringBlueprint(parsedJD, mockUserProfile, mockGithubProfile);
    const prompt = createResumePrompt(mockJD, mockUserProfile, blueprint);

    // Verify experience level affects tone
    assertContains(prompt, blueprint.experienceMatchLevel, 'Should include experience match level');

    // High experience should have confident tone
    if (blueprint.experienceMatchLevel === 'High') {
        assertTrue(
            prompt.includes('Confident') || prompt.includes('results-driven'),
            'High experience should suggest confident tone'
        );
    }
}

function testKeywordInjectionList() {
    const parsedJD = parseJobDescription(mockJD);
    const blueprint = generateTailoringBlueprint(parsedJD, mockUserProfile, mockGithubProfile);
    const prompt = createResumePrompt(mockJD, mockUserProfile, blueprint);

    // Verify keyword injection list is present
    assertTrue(
        blueprint.keywordInjectionList.length > 0,
        'Should have keyword injection list'
    );

    assertContains(
        prompt,
        'KEYWORD INJECTION LIST',
        'Should include keyword injection section'
    );

    // At least some keywords should appear
    const keywordsInPrompt = blueprint.keywordInjectionList.filter(kw =>
        prompt.toLowerCase().includes(kw.toLowerCase())
    );

    assertGreaterThan(
        keywordsInPrompt.length,
        0,
        'At least some keywords should be in prompt'
    );
}

function testBackwardCompatibility() {
    // Test that prompt still works without blueprint
    const promptWithoutBlueprint = createResumePrompt(mockJD, mockUserProfile);

    assertTrue(
        typeof promptWithoutBlueprint === 'string',
        'Should work without blueprint'
    );
    assertGreaterThan(
        promptWithoutBlueprint.length,
        300,
        'Basic prompt should still be substantial'
    );
}

function testPromptStructureValidation() {
    const parsedJD = parseJobDescription(mockJD);
    const blueprint = generateTailoringBlueprint(parsedJD, mockUserProfile, mockGithubProfile);
    const prompt = createResumePrompt(mockJD, mockUserProfile, blueprint);

    // Verify key sections exist
    const requiredSections = [
        'CRITICAL REQUIREMENTS',
        'JOB DESCRIPTION',
        'USER PROFILE',
        'OUTPUT FORMAT',
        'TAILORING STRATEGY'
    ];

    requiredSections.forEach(section => {
        assertContains(prompt, section, `Prompt should contain ${section} section`);
    });
}

// ==================== INTEGRATION SCENARIO TESTS ====================

function testHighMatchScenario() {
    const highMatchProfile = {
        ...mockUserProfile,
        skills: ['React', 'Node.js', 'TypeScript', 'MongoDB', 'Docker', 'AWS'],
        totalExperience: '7 years'
    };

    const parsedJD = parseJobDescription(mockJD);
    const blueprint = generateTailoringBlueprint(parsedJD, highMatchProfile, mockGithubProfile);
    const prompt = createResumePrompt(mockJD, highMatchProfile, blueprint);

    assertTrue(
        blueprint.experienceMatchLevel === 'High',
        'Should have high experience match'
    );
    assertGreaterThan(
        blueprint.matchedSkills.length,
        3,
        'Should have multiple matched skills'
    );
    assertContains(
        prompt,
        'Confident',
        'High match should suggest confident tone'
    );
}

function testLowMatchScenario() {
    const lowMatchProfile = {
        ...mockUserProfile,
        skills: ['Python', 'Django', 'PostgreSQL'],
        totalExperience: '1 year'
    };

    const lowGithubProfile = {
        topLanguages: ['Python'],
        projects: [
            {
                name: 'Blog API',
                description: 'Django REST framework blog',
                languages: ['Python', 'Django'],
                stars: 0,
                url: 'https://github.com/user/blog'
            }
        ],
        stats: { totalRepos: 1, totalStars: 0, totalCommits: 5 }
    };

    const parsedJD = parseJobDescription(mockJD);
    const blueprint = generateTailoringBlueprint(parsedJD, lowMatchProfile, lowGithubProfile);
    const prompt = createResumePrompt(mockJD, lowMatchProfile, blueprint);

    assertTrue(
        blueprint.experienceMatchLevel === 'Low',
        'Should have low experience match'
    );
    assertGreaterThan(
        blueprint.missingSkills.length,
        blueprint.matchedSkills.length,
        'Should have more missing than matched skills'
    );
    assertContains(
        prompt,
        'transferable',
        'Low match should emphasize transferable skills'
    );
}

// ==================== RUN ALL TESTS ====================

console.log('\n🧪 Running Resume Generator Integration Tests\n');
console.log('='.repeat(50));

let passCount = 0;
let failCount = 0;

const tests = [
    { name: '1. Full Pipeline Integration', fn: testFullPipelineIntegration },
    { name: '2. Blueprint Injection in Prompt', fn: testBlueprintInjectionInPrompt },
    { name: '3. Matched Skills Highlighting', fn: testMatchedSkillsHighlighting },
    { name: '4. Recommended Projects Prioritization', fn: testRecommendedProjectsPrioritization },
    { name: '5. Experience Level Tone Adjustment', fn: testExperienceLevelToneAdjustment },
    { name: '6. Keyword Injection List', fn: testKeywordInjectionList },
    { name: '7. Backward Compatibility', fn: testBackwardCompatibility },
    { name: '8. Prompt Structure Validation', fn: testPromptStructureValidation },
    { name: '9. High Match Scenario', fn: testHighMatchScenario },
    { name: '10. Low Match Scenario', fn: testLowMatchScenario }
];

tests.forEach(test => {
    if (runTest(test.name, test.fn)) {
        passCount++;
    } else {
        failCount++;
    }
});

console.log('='.repeat(50));
console.log(`\n📊 Test Results: ${passCount} passed, ${failCount} failed\n`);

if (failCount === 0) {
    console.log('🎉 All tests passed!\n');
    process.exit(0);
} else {
    console.log('⚠️  Some tests failed\n');
    process.exit(1);
}
