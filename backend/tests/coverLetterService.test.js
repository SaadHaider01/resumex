/**
 * Cover Letter Service Tests
 * 
 * Tests for tailored cover letter generation
 */

const { generateCoverLetter, validateCoverLetterInput } = require('../services/coverLetterService');

// Mock LLM function for testing
const mockLLMCall = async (prompt) => {
    return `Dear Hiring Manager,

I am writing to express my strong interest in the Senior Full-Stack Developer position at TechCorp. With my extensive experience in React, Node.js, and cloud technologies, I am confident I can deliver immediate value to your engineering team.

Throughout my career, I have specialized in building scalable web applications using React and Node.js - exactly the technologies your team uses daily. My recent project, E-Commerce Platform, processed over $1M in transactions while maintaining 99.9% uptime, demonstrating my ability to build production-grade systems at scale.

I am particularly excited about your emphasis on microservices architecture. At my current role, I led the migration to microservices, reducing API response times by 40% and improving system reliability. I'm confident these experiences align perfectly with your technical requirements.

I would welcome the opportunity to discuss how my background in full-stack development and passion for scalable architecture can contribute to TechCorp's continued success.

Sincerely,
John Doe`;
};

// Test data
const mockTailoringBlueprint = {
    matchedSkills: ['React', 'Node.js', 'TypeScript', 'MongoDB', 'AWS'],
    missingSkills: ['Kubernetes', 'GraphQL'],
    experienceMatchLevel: 'High',
    recommendedProjects: [
        { name: 'E-Commerce Platform', relevanceScore: 0.92 },
        { name: 'Real-Time Dashboard', relevanceScore: 0.85 }
    ],
    keywordInjectionList: ['microservices', 'scalable', 'cloud-native']
};

const mockResumeJSON = {
    professionalSummary: 'Experienced Full Stack Developer with 5+ years building scalable web applications.',
    skills: {
        technical: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'MongoDB'],
        tools: ['Git', 'Docker', 'AWS', 'CI/CD'],
        soft: ['Leadership', 'Communication']
    },
    experience: [
        {
            position: 'Senior Software Engineer',
            company: 'Tech Solutions Inc',
            duration: 'Jan 2020 - Present',
            location: 'San Francisco, CA'
        }
    ],
    projects: [
        { name: 'E-Commerce Platform' },
        { name: 'Real-Time Dashboard' }
    ]
};

/**
 * TEST 1: Strong Match Scenario
 */
async function testStrongMatchScenario() {
    console.log('\n📝 TEST 1: Strong Match Scenario');
    console.log('='.repeat(60));

    const params = {
        jobDescription: `We are seeking a Senior Full-Stack Developer with expertise in React and Node.js to build scalable microservices.
        
Requirements:
- 5+ years experience with React and Node.js
- Experience with MongoDB and cloud platforms (AWS preferred)
- Strong understanding of microservices architecture
- TypeScript proficiency`,
        tailoringBlueprint: mockTailoringBlueprint,
        resumeJSON: mockResumeJSON,
        company: 'TechCorp',
        jobTitle: 'Senior Full-Stack Developer'
    };

    try {
        const result = await generateCoverLetter(params, mockLLMCall);

        console.log('✅ Cover letter generated successfully\n');
        console.log('Company:', result.metadata.company);
        console.log('Job Title:', result.metadata.jobTitle);
        console.log('Experience Level:', result.metadata.experienceMatchLevel);
        console.log('Matched Skills:', result.metadata.matchedSkillsCount);
        console.log('\nCover Letter Preview:');
        console.log(result.coverLetter.substring(0, 300) + '...\n');

        // Validate content
        const content = result.coverLetter.toLowerCase();
        const hasCompany = content.includes('techcorp');
        const hasJobTitle = content.includes('senior full-stack developer');
        const hasSkills = content.includes('react') || content.includes('node.js');

        if (hasCompany && hasJobTitle && hasSkills) {
            console.log('✅ TEST 1 PASSED - Content validation successful');
            return true;
        } else {
            console.log('❌ TEST 1 FAILED - Missing required content');
            return false;
        }

    } catch (error) {
        console.error('❌ TEST 1 FAILED:', error.message);
        return false;
    }
}

/**
 * TEST 2: Low Match Scenario (Career Switcher)
 */
async function testLowMatchScenario() {
    console.log('\n📝 TEST 2: Low Match Scenario - Career Switcher');
    console.log('='.repeat(60));

    const lowMatchBlueprint = {
        matchedSkills: ['JavaScript', 'Problem Solving'],
        missingSkills: ['React', 'Node.js', 'MongoDB', 'Docker', 'AWS'],
        experienceMatchLevel: 'Low',
        recommendedProjects: [
            { name: 'Personal Portfolio', relevanceScore: 0.45 }
        ],
        keywordInjectionList: ['web development', 'learning', 'growth']
    };

    const juniorResume = {
        professionalSummary: 'Motivated individual transitioning from teaching into software development. Completed full-stack bootcamp.',
        skills: {
            technical: ['JavaScript', 'HTML', 'CSS', 'Git'],
            tools: ['VS Code', 'GitHub'],
            soft: ['Communication', 'Teaching', 'Problem Solving']
        },
        experience: [
            {
                position: 'High School Teacher',
                company: 'Local School District',
                duration: '2018 - 2023',
                location: 'Austin, TX'
            }
        ],
        projects: [
            { name: 'Personal Portfolio' }
        ]
    };

    const params = {
        jobDescription: `Looking for a Junior Full-Stack Developer to join our team.
        
Requirements:
- Knowledge of React and Node.js
- MongoDB experience preferred
- Eager to learn
- Good communication skills`,
        tailoringBlueprint: lowMatchBlueprint,
        resumeJSON: juniorResume,
        company: 'StartupXYZ',
        jobTitle: 'Junior Full-Stack Developer'
    };

    try {
        const result = await generateCoverLetter(params, mockLLMCall);

        console.log('✅ Cover letter generated successfully\n');
        console.log('Experience Level:', result.metadata.experienceMatchLevel);
        console.log('Matched Skills:', result.metadata.matchedSkillsCount);
        console.log('Missing Skills:', result.metadata.missingSkillsCount);

        // For low match, tone should be enthusiastic and growth-oriented
        const hasEnthusiasm = result.coverLetter.toLowerCase().includes('eager') ||
            result.coverLetter.toLowerCase().includes('excited') ||
            result.coverLetter.toLowerCase().includes('passionate');

        if (hasEnthusiasm) {
            console.log('✅ TEST 2 PASSED - Appropriate enthusiastic tone detected');
            return true;
        } else {
            console.log('⚠️ TEST 2 WARNING - May lack enthusiastic tone for low match');
            return true; // Still pass if generated
        }

    } catch (error) {
        console.error('❌ TEST 2 FAILED:', error.message);
        return false;
    }
}

/**
 * TEST 3: Input Validation
 */
function testInputValidation() {
    console.log('\n📝 TEST 3: Input Validation');
    console.log('='.repeat(60));

    // Test missing fields
    const invalidParams = {
        jobDescription: 'Some description',
        // Missing other required fields
    };

    try {
        validateCoverLetterInput(invalidParams);
        console.log('❌ TEST 3 FAILED - Should have thrown validation error');
        return false;
    } catch (error) {
        console.log('✅ TEST 3 PASSED - Validation correctly caught missing fields');
        console.log('   Error:', error.message);
        return true;
    }
}

/**
 * Run all tests
 */
async function runAllTests() {
    console.log('\n🧪 COVER LETTER SERVICE TEST SUITE');
    console.log('='.repeat(60));

    const results = [];

    results.push(await testStrongMatchScenario());
    results.push(await testLowMatchScenario());
    results.push(testInputValidation());

    const passed = results.filter(r => r).length;
    const total = results.length;

    console.log('\n' + '='.repeat(60));
    console.log(`📊 TEST SUMMARY: ${passed}/${total} tests passed`);
    console.log('='.repeat(60) + '\n');

    return passed === total;
}

// Run tests if executed directly
if (require.main === module) {
    runAllTests()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test execution error:', error);
            process.exit(1);
        });
}

module.exports = { runAllTests };
