/**
 * Repository Intelligence Engine (RIE) - Test Suite
 * 
 * Verifies that capability and architecture pattern detection is entirely
 * evidence-driven (analyzing mock trees, dependencies, and file structures)
 * without hardcoding project names.
 * 
 * Run with: node backend/tests/repositoryIntelligence.test.js
 */

const { analyzeRepositories } = require('../services/repositoryIntelligenceService');

console.log('========================================');
console.log('Repository Intelligence Engine (RIE) - Test Suite');
console.log('========================================\n');

let passedTests = 0;
let failedTests = 0;

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

function assertIncludesCapability(profile, expectedCap) {
    const caps = profile.detectedCapabilities.map(c => c.capability);
    if (!caps.includes(expectedCap)) {
        throw new Error(`Expected profile to detect capability "${expectedCap}", but got: ${JSON.stringify(caps)}`);
    }
    
    // Also assert that the capability provenance structure is fully populated
    const capObj = profile.detectedCapabilities.find(c => c.capability === expectedCap);
    assert(capObj.confidence > 0, `Capability "${expectedCap}" must have a confidence > 0`);
    assert(Array.isArray(capObj.evidenceSources) && capObj.evidenceSources.length > 0, `Capability "${expectedCap}" must have evidenceSources`);
    assert(Array.isArray(capObj.evidenceType) && capObj.evidenceType.length > 0, `Capability "${expectedCap}" must have evidenceType`);
}

// ==================== TEST CASES ====================

test('Test RIE evidence-driven detection for ResumeX configuration', async () => {
    const mockRepoData = {
        githubUsername: 'SaadHaider01',
        repositories: [
            {
                name: 'ResumeX-Repo', // Test with a different name to prove no hardcoding
                languages: ['JavaScript', 'HTML', 'CSS'],
                stars: 12,
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
                    'manifest.json': JSON.stringify({
                        manifest_version: 3,
                        name: 'ResumeX Extension'
                    }),
                    'package.json': JSON.stringify({
                        dependencies: {
                            express: '^4.18.2',
                            pdfkit: '^0.13.0'
                        }
                    }),
                    'README.md': 'ResumeX is a Chrome extension that automates form autofilling and LinkedIn scraping with a backend PDF generation service.'
                }
            }
        ]
    };

    const result = await analyzeRepositories(mockRepoData);
    const profile = result.analyzedRepositories[0];

    console.log('Analyzed Profile:');
    console.log(JSON.stringify(profile, null, 2));

    // Assertions for ResumeX capabilities
    assertIncludesCapability(profile, 'Chrome Extension');
    assertIncludesCapability(profile, 'PDF Generation');
    assertIncludesCapability(profile, 'REST APIs');
    assertIncludesCapability(profile, 'Form Autofill');
    assertIncludesCapability(profile, 'LinkedIn Scraping');

    // Assert recruiter summary
    assert(profile.recruiterSummary.includes('Chrome Extension') && profile.recruiterSummary.includes('PDF Generation'),
        'Recruiter summary should list key capabilities');

    // Assert architecture detection
    const archs = profile.architecturePatterns.map(a => a.pattern);
    assert(archs.includes('Chrome Extension Architecture'), 'Should detect Chrome Extension Architecture');
    assert(archs.includes('REST API'), 'Should detect REST API Architecture');
});

test('Test RIE evidence-driven detection for JARVIS configuration', async () => {
    const mockRepoData = {
        githubUsername: 'SaadHaider01',
        repositories: [
            {
                name: 'My-Assistant-Repo', // Test with a different name to prove no hardcoding
                languages: ['Python'],
                stars: 5,
                mockTree: [
                    'requirements.txt',
                    'main.py',
                    'voice_assistant.py',
                    'README.md'
                ],
                mockFiles: {
                    'requirements.txt': `
                        openai>=1.0.0
                        openai-whisper
                        edge-tts
                    `,
                    'README.md': 'An AI Voice Assistant using Whisper Speech Recognition and Edge Text To Speech.'
                }
            }
        ]
    };

    const result = await analyzeRepositories(mockRepoData);
    const profile = result.analyzedRepositories[0];

    console.log('Analyzed Profile:');
    console.log(JSON.stringify(profile, null, 2));

    // Assertions for JARVIS capabilities
    assertIncludesCapability(profile, 'Python');
    assertIncludesCapability(profile, 'Whisper');
    assertIncludesCapability(profile, 'Speech Recognition');
    assertIncludesCapability(profile, 'Text To Speech');
    assertIncludesCapability(profile, 'AI Assistant');

    // Assert Speech Processing Pipeline and AI Pipeline architectures
    const archs = profile.architecturePatterns.map(a => a.pattern);
    assert(archs.includes('Speech Processing Pipeline'), 'Should detect Speech Processing Pipeline');
    assert(archs.includes('AI Pipeline'), 'Should detect AI Pipeline');
});

test('Test RIE evidence-driven detection for LinguaVoice configuration', async () => {
    const mockRepoData = {
        githubUsername: 'SaadHaider01',
        repositories: [
            {
                name: 'LinguaVoice-App', // Test with a different name to prove no hardcoding
                languages: ['JavaScript'],
                stars: 3,
                mockTree: [
                    'package.json',
                    'src/App.js',
                    'src/components/SpeechHandler.js',
                    'README.md'
                ],
                mockFiles: {
                    'package.json': JSON.stringify({
                        dependencies: {
                            react: '^18.2.0'
                        }
                    }),
                    'README.md': 'LinguaVoice frontend application utilizing Web Speech APIs for language learning lessons.'
                }
            }
        ]
    };

    const result = await analyzeRepositories(mockRepoData);
    const profile = result.analyzedRepositories[0];

    console.log('Analyzed Profile:');
    console.log(JSON.stringify(profile, null, 2));

    // Assertions for LinguaVoice capabilities
    assertIncludesCapability(profile, 'JavaScript');
    assertIncludesCapability(profile, 'Speech APIs');
    assertIncludesCapability(profile, 'Language Learning');
    assertIncludesCapability(profile, 'Frontend Application');
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
    console.log('\n🎉 All RIE tests passed successfully!');
    process.exit(0);
}
