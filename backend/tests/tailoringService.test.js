/**
 * Tailoring Service Tests
 * 
 * Tests for the core intelligence layer with 3 profile scenarios:
 * 1. Strong match profile
 * 2. Partial match profile
 * 3. Low match profile
 */

const {
    generateTailoringBlueprint,
    matchSkills,
    scoreProjects,
    calculateExperienceMatch,
    generateKeywordList
} = require('../services/tailoringService');

// ==================== TEST DATA ====================

// Mock parsed JD
const mockJD = {
    skills: ['React', 'Node.js', 'MongoDB', 'Docker', 'AWS'],
    experience: '3+ years',
    requirements: [
        'Build scalable REST APIs',
        'Experience with cloud-native applications',
        'Strong understanding of microservices architecture'
    ],
    qualifications: [
        'Bachelor\'s degree in Computer Science',
        'Excellent problem-solving skills'
    ],
    description: 'Looking for a full-stack developer with experience in building cloud-native applications using modern JavaScript frameworks.'
};

// Strong match profile
const strongUserProfile = {
    skills: ['React', 'Node.js', 'MongoDB', 'JavaScript', 'TypeScript'],
    totalExperience: '5 years'
};

const strongGithubProfile = {
    topLanguages: ['JavaScript', 'TypeScript', 'Python'],
    projects: [
        {
            name: 'E-commerce Platform',
            description: 'Scalable REST API built with Node.js and MongoDB',
            languages: ['JavaScript', 'Node.js', 'MongoDB'],
            stars: 45,
            url: 'https://github.com/user/ecommerce'
        },
        {
            name: 'React Dashboard',
            description: 'Real-time analytics dashboard using React and WebSockets',
            languages: ['React', 'JavaScript'],
            stars: 23,
            url: 'https://github.com/user/dashboard'
        },
        {
            name: 'Python Script',
            description: 'Simple automation script',
            languages: ['Python'],
            stars: 2,
            url: 'https://github.com/user/script'
        }
    ]
};

// Partial match profile
const partialUserProfile = {
    skills: ['React', 'JavaScript', 'CSS', 'HTML'],
    totalExperience: '2 years'
};

const partialGithubProfile = {
    topLanguages: ['JavaScript', 'CSS', 'HTML'],
    projects: [
        {
            name: 'Portfolio Website',
            description: 'Personal portfolio built with React',
            languages: ['React', 'JavaScript'],
            stars: 5,
            url: 'https://github.com/user/portfolio'
        },
        {
            name: 'Todo App',
            description: 'Simple todo application',
            languages: ['JavaScript', 'HTML', 'CSS'],
            stars: 1,
            url: 'https://github.com/user/todo'
        }
    ]
};

// Low match profile
const lowUserProfile = {
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
    ]
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

function assertEqual(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}\n   Expected: ${JSON.stringify(expected)}\n   Actual: ${JSON.stringify(actual)}`);
    }
}

function assertContains(array, item, message) {
    if (!array.includes(item)) {
        throw new Error(`${message}\n   Expected array to contain: ${item}\n   Actual: ${JSON.stringify(array)}`);
    }
}

function assertGreaterThan(actual, threshold, message) {
    if (actual <= threshold) {
        throw new Error(`${message}\n   Expected: > ${threshold}\n   Actual: ${actual}`);
    }
}

function assertLessThan(actual, threshold, message) {
    if (actual >= threshold) {
        throw new Error(`${message}\n   Expected: < ${threshold}\n   Actual: ${actual}`);
    }
}

// ==================== UNIT TESTS ====================

function testStrongMatchProfile() {
    const blueprint = generateTailoringBlueprint(mockJD, strongUserProfile, strongGithubProfile);

    // Should have most skills matched
    assertGreaterThan(blueprint.matchedSkills.length, 2, 'Strong profile should match multiple skills');
    assertContains(blueprint.matchedSkills, 'react', 'Should match React');
    assertContains(blueprint.matchedSkills, 'node.js', 'Should match Node.js');
    assertContains(blueprint.matchedSkills, 'mongodb', 'Should match MongoDB');

    // Should have some missing skills
    assertContains(blueprint.missingSkills, 'docker', 'Should identify Docker as missing');
    assertContains(blueprint.missingSkills, 'aws', 'Should identify AWS as missing');

    // Should have high-scoring projects
    assertEqual(blueprint.recommendedProjects.length, 3, 'Should return 3 projects');
    assertGreaterThan(blueprint.recommendedProjects[0].relevanceScore, 0.3, 'Top project should have high relevance');

    // Should have high experience match
    assertEqual(blueprint.experienceMatchLevel, 'High', 'Should have High experience match');

    // Should have keyword injection list
    assertGreaterThan(blueprint.keywordInjectionList.length, 0, 'Should have keywords');
}

function testPartialMatchProfile() {
    const blueprint = generateTailoringBlueprint(mockJD, partialUserProfile, partialGithubProfile);

    // Should have some skills matched (React at minimum)
    assertGreaterThan(blueprint.matchedSkills.length, 0, 'Partial profile should match some skills');
    assertContains(blueprint.matchedSkills, 'react', 'Should match React');

    // Should have more missing skills
    assertGreaterThan(blueprint.missingSkills.length, 3, 'Should have multiple missing skills');
    assertContains(blueprint.missingSkills, 'node.js', 'Should identify Node.js as missing');
    assertContains(blueprint.missingSkills, 'mongodb', 'Should identify MongoDB as missing');

    // Should have lower-scoring projects
    assertEqual(blueprint.recommendedProjects.length, 2, 'Should return 2 projects');
    assertLessThan(blueprint.recommendedProjects[0].relevanceScore, 0.5, 'Projects should have lower relevance');

    // Should have moderate or low experience match
    const validLevels = ['Moderate', 'Low'];
    if (!validLevels.includes(blueprint.experienceMatchLevel)) {
        throw new Error(`Experience level should be Moderate or Low, got ${blueprint.experienceMatchLevel}`);
    }

    // Should still have keywords
    assertGreaterThan(blueprint.keywordInjectionList.length, 0, 'Should have keywords');
}

function testLowMatchProfile() {
    const blueprint = generateTailoringBlueprint(mockJD, lowUserProfile, lowGithubProfile);

    // Should have very few or no matched skills
    assertLessThan(blueprint.matchedSkills.length, 2, 'Low profile should match few skills');

    // Should have most skills missing
    assertGreaterThan(blueprint.missingSkills.length, 3, 'Should have most skills missing');

    // Should have low-scoring projects
    assertEqual(blueprint.recommendedProjects.length, 1, 'Should return 1 project');
    assertLessThan(blueprint.recommendedProjects[0].relevanceScore, 0.3, 'Projects should have low relevance');

    // Should have low experience match
    assertEqual(blueprint.experienceMatchLevel, 'Low', 'Should have Low experience match');

    // Should have many keywords (trying to compensate)
    assertGreaterThan(blueprint.keywordInjectionList.length, 5, 'Should have many keywords');
}

// ==================== INTEGRATION TEST ====================

function testBlueprintStructure() {
    const blueprint = generateTailoringBlueprint(mockJD, strongUserProfile, strongGithubProfile);

    // Verify structure
    if (!blueprint.matchedSkills || !Array.isArray(blueprint.matchedSkills)) {
        throw new Error('Blueprint should have matchedSkills array');
    }
    if (!blueprint.missingSkills || !Array.isArray(blueprint.missingSkills)) {
        throw new Error('Blueprint should have missingSkills array');
    }
    if (!blueprint.recommendedProjects || !Array.isArray(blueprint.recommendedProjects)) {
        throw new Error('Blueprint should have recommendedProjects array');
    }
    if (!blueprint.experienceMatchLevel || typeof blueprint.experienceMatchLevel !== 'string') {
        throw new Error('Blueprint should have experienceMatchLevel string');
    }
    if (!blueprint.keywordInjectionList || !Array.isArray(blueprint.keywordInjectionList)) {
        throw new Error('Blueprint should have keywordInjectionList array');
    }

    // Verify project structure
    blueprint.recommendedProjects.forEach((project, idx) => {
        if (!project.name) {
            throw new Error(`Project ${idx} should have name`);
        }
        if (typeof project.relevanceScore !== 'number') {
            throw new Error(`Project ${idx} should have numeric relevanceScore`);
        }
        if (project.relevanceScore < 0 || project.relevanceScore > 1) {
            throw new Error(`Project ${idx} relevanceScore should be between 0 and 1`);
        }
    });
}

// ==================== EDGE CASES ====================

function testMissingInputs() {
    try {
        generateTailoringBlueprint(null, strongUserProfile, strongGithubProfile);
        throw new Error('Should have thrown error for null parsedJD');
    } catch (error) {
        if (!error.message.includes('Missing required input data')) {
            throw new Error('Should throw proper error message');
        }
    }
}

function testEmptyData() {
    const emptyJD = { skills: [], experience: '', requirements: [], qualifications: [], description: '' };
    const emptyProfile = { skills: [], totalExperience: '' };
    const emptyGithub = { topLanguages: [], projects: [] };

    const blueprint = generateTailoringBlueprint(emptyJD, emptyProfile, emptyGithub);

    assertEqual(blueprint.matchedSkills.length, 0, 'Should have no matched skills');
    assertEqual(blueprint.missingSkills.length, 0, 'Should have no missing skills');
    assertEqual(blueprint.recommendedProjects.length, 0, 'Should have no projects');
}

// ==================== RUN ALL TESTS ====================

console.log('\n🧪 Running Tailoring Service Tests\n');
console.log('='.repeat(50));

let passCount = 0;
let failCount = 0;

const tests = [
    { name: '1. Strong Match Profile', fn: testStrongMatchProfile },
    { name: '2. Partial Match Profile', fn: testPartialMatchProfile },
    { name: '3. Low Match Profile', fn: testLowMatchProfile },
    { name: '4. Blueprint Structure Validation', fn: testBlueprintStructure },
    { name: '5. Missing Inputs Error Handling', fn: testMissingInputs },
    { name: '6. Empty Data Handling', fn: testEmptyData }
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
