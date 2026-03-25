/**
 * Job Description Parser Tests
 * 
 * Run with: node backend/tests/jdParser.test.js
 */

const { parseJobDescription } = require('../services/jdParser');

console.log('========================================');
console.log('Job Description Parser - Test Suite');
console.log('========================================\n');

let passedTests = 0;
let failedTests = 0;

/**
 * Simple test helper
 */
function test(testName, fn) {
    try {
        console.log(`📝 TEST: ${testName}`);
        fn();
        console.log('✅ PASSED\n');
        passedTests++;
    } catch (error) {
        console.error('❌ FAILED:', error.message);
        console.error(error.stack);
        console.log('');
        failedTests++;
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertIncludes(array, item, message) {
    if (!array.includes(item)) {
        throw new Error(message || `Expected array to include ${item}, but got: ${JSON.stringify(array)}`);
    }
}

// ==================== TEST CASES ====================

// Test Case 1: Full Stack Developer with clear requirements
test('Test 1: Full Stack Developer JD', () => {
    const jd = `
    We are looking for a Full Stack Developer with 2+ years of experience.
    Required skills include React, Node.js, MongoDB, REST APIs, and AWS.
    Experience with Docker and CI/CD is a plus.
  `;

    const result = parseJobDescription(jd);

    console.log('Input JD:', jd.trim());
    console.log('\nParsed Output:');
    console.log(JSON.stringify(result, null, 2));

    assert(result.role.toLowerCase().includes('full stack'), 'Should extract "Full Stack" role');
    assertIncludes(result.skills, 'React', 'Should detect React skill');
    assertIncludes(result.skills, 'Node.js', 'Should detect Node.js skill');
    assertIncludes(result.skills, 'MongoDB', 'Should detect MongoDB skill');
    assertIncludes(result.skills, 'AWS', 'Should detect AWS skill');
    assert(result.experience && result.experience.includes('2'), 'Should extract "2+ years" experience');
    assert(result.keywords.length > 0, 'Should extract keywords');
});

// Test Case 2: Senior Backend Engineer with specific tech stack
test('Test 2: Senior Backend Engineer JD', () => {
    const jd = `
    Senior Backend Engineer
    
    We're seeking a Senior Backend Engineer with 5-7 years of experience to join our microservices team.
    
    Must have:
    - Python, Django, FastAPI
    - PostgreSQL, Redis
    - Kubernetes, Docker
    - AWS or GCP
    
    You will build scalable APIs and work on distributed systems.
  `;

    const result = parseJobDescription(jd);

    console.log('Input JD:', jd.trim());
    console.log('\nParsed Output:');
    console.log(JSON.stringify(result, null, 2));

    assert(result.role.toLowerCase().includes('backend') || result.role.toLowerCase().includes('engineer'),
        'Should extract Backend Engineer role');
    assertIncludes(result.skills, 'Python', 'Should detect Python');
    assertIncludes(result.skills, 'Django', 'Should detect Django');
    assertIncludes(result.skills, 'PostgreSQL', 'Should detect PostgreSQL');
    assertIncludes(result.skills, 'Kubernetes', 'Should detect Kubernetes');
    assert(result.experience && (result.experience.includes('5') || result.experience.includes('7')),
        'Should extract 5-7 years experience');
    assertIncludes(result.keywords, 'microservices', 'Should extract microservices keyword');
    assertIncludes(result.keywords, 'scalable', 'Should extract scalable keyword');
});

// Test Case 3: Frontend Developer with modern stack
test('Test 3: Frontend Developer JD', () => {
    const jd = `
    Frontend Developer Position
    
    Looking for a frontend developer with at least 3 years of experience in React.
    Knowledge of TypeScript, Next.js, and Tailwind CSS is required.
    You'll work on responsive web applications with a focus on performance optimization.
  `;

    const result = parseJobDescription(jd);

    console.log('Input JD:', jd.trim());
    console.log('\nParsed Output:');
    console.log(JSON.stringify(result, null, 2));

    assert(result.role.toLowerCase().includes('frontend'), 'Should extract Frontend role');
    assertIncludes(result.skills, 'React', 'Should detect React');
    assertIncludes(result.skills, 'TypeScript', 'Should detect TypeScript');
    assertIncludes(result.skills, 'Next.js', 'Should detect Next.js');
    assertIncludes(result.skills, 'Tailwind', 'Should detect Tailwind');
    assert(result.experience && result.experience.includes('3'), 'Should extract 3 years experience');
    assertIncludes(result.keywords, 'responsive', 'Should extract responsive keyword');
    assertIncludes(result.keywords, 'performance', 'Should extract performance keyword');
});

// Test Case 4: Edge case - minimal JD
test('Test 4: Minimal JD with limited info', () => {
    const jd = 'Hiring a developer with JavaScript and Git experience.';

    const result = parseJobDescription(jd);

    console.log('Input JD:', jd);
    console.log('\nParsed Output:');
    console.log(JSON.stringify(result, null, 2));

    assertIncludes(result.skills, 'JavaScript', 'Should detect JavaScript');
    assertIncludes(result.skills, 'Git', 'Should detect Git');
    assert(result.experience === null, 'Should return null for missing experience');
    assert(typeof result.role === 'string', 'Role should be a string (may be empty)');
    assert(Array.isArray(result.keywords), 'Keywords should be an array');
});

// Test Case 5: Complex JD with multiple technologies
test('Test 5: DevOps Engineer with extensive requirements', () => {
    const jd = `
    We are hiring a DevOps Engineer with minimum 4 years of experience.
    
    Required skills:
    - AWS, Azure, or GCP
    - Docker, Kubernetes
    - CI/CD pipelines (Jenkins, GitHub Actions)
    - Infrastructure as Code (Terraform, Ansible)
    - Scripting (Python, Bash)
    
    Experience with monitoring tools and agile methodology is essential.
  `;

    const result = parseJobDescription(jd);

    console.log('Input JD:', jd.trim());
    console.log('\nParsed Output:');
    console.log(JSON.stringify(result, null, 2));

    assert(result.role.toLowerCase().includes('devops'), 'Should extract DevOps role');
    assertIncludes(result.skills, 'AWS', 'Should detect AWS');
    assertIncludes(result.skills, 'Docker', 'Should detect Docker');
    assertIncludes(result.skills, 'Kubernetes', 'Should detect Kubernetes');
    assertIncludes(result.skills, 'Python', 'Should detect Python');
    assert(result.experience && result.experience.includes('4'), 'Should extract 4 years experience');
    assertIncludes(result.keywords, 'ci/cd', 'Should extract ci/cd keyword');
    assertIncludes(result.keywords, 'agile', 'Should extract agile keyword');
});

// ==================== TEST SUMMARY ====================

console.log('========================================');
console.log('Test Summary');
console.log('========================================');
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(`📊 Total:  ${passedTests + failedTests}`);
console.log('========================================');

if (failedTests > 0) {
    process.exit(1);
} else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
}
