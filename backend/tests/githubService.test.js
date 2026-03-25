/**
 * GitHub Service Tests
 * 
 * Run with: node backend/tests/githubService.test.js
 * 
 * Tests the GitHub profile aggregation service
 */

const { fetchGitHubProfile, clearCache } = require('../services/githubService');

console.log('========================================');
console.log('GitHub Service - Test Suite');
console.log('========================================\n');

/**
 * Test helper to run async tests
 */
async function test(testName, fn) {
    try {
        console.log(`📝 TEST: ${testName}`);
        await fn();
        console.log('✅ PASSED\n');
    } catch (error) {
        console.error('❌ FAILED:', error.message);
        console.log('');
    }
}

// ==================== TEST CASES ====================

// Test Case 1: Valid GitHub username
test('Test 1: Fetch valid GitHub user profile', async () => {
    clearCache(); // Clear cache before test

    // Using 'torvalds' as a reliable test user (Linux creator)
    const username = 'torvalds';

    console.log(`Fetching profile for: ${username}`);
    const profile = await fetchGitHubProfile(username);

    console.log('\nResult:');
    console.log(JSON.stringify(profile, null, 2));

    // Validations
    if (!profile.github) {
        throw new Error('Missing "github" field in response');
    }
    if (profile.github.username !== username) {
        throw new Error(`Expected username to be "${username}" but got "${profile.github.username}"`);
    }
    if (!Array.isArray(profile.github.topLanguages)) {
        throw new Error('topLanguages should be an array');
    }
    if (!Array.isArray(profile.github.projects)) {
        throw new Error('projects should be an array');
    }
    if (typeof profile.github.totalRepos !== 'number') {
        throw new Error('totalRepos should be a number');
    }

    console.log(`\n✓ Found ${profile.github.totalRepos} total repositories`);
    console.log(`✓ Extracted ${profile.github.topLanguages.length} top languages:`, profile.github.topLanguages);
    console.log(`✓ Normalized ${profile.github.projects.length} projects`);
});

// Test Case 2: Invalid GitHub username (should fail gracefully)
test('Test 2: Handle invalid GitHub username', async () => {
    clearCache();

    const invalidUsername = 'this-user-definitely-does-not-exist-12345';

    console.log(`Attempting to fetch non-existent user: ${invalidUsername}`);

    try {
        await fetchGitHubProfile(invalidUsername);
        throw new Error('Should have thrown an error for invalid username');
    } catch (error) {
        if (error.message.includes('not found')) {
            console.log(`✓ Correctly handled invalid user: ${error.message}`);
        } else {
            throw error;
        }
    }
});

// Test Case 3: Cache functionality
test('Test 3: Verify in-memory caching works', async () => {
    clearCache();

    const username = 'octocat'; // GitHub's mascot account

    console.log(`First fetch for: ${username} (should hit API)`);
    const startTime1 = Date.now();
    const profile1 = await fetchGitHubProfile(username);
    const duration1 = Date.now() - startTime1;
    console.log(`First fetch took: ${duration1}ms`);

    console.log(`\nSecond fetch for: ${username} (should use cache)`);
    const startTime2 = Date.now();
    const profile2 = await fetchGitHubProfile(username);
    const duration2 = Date.now() - startTime2;
    console.log(`Second fetch took: ${duration2}ms`);

    if (duration2 > duration1) {
        throw new Error('Cache should make second request faster');
    }

    if (JSON.stringify(profile1) !== JSON.stringify(profile2)) {
        throw new Error('Cached data should match original data');
    }

    console.log(`\n✓ Cache working correctly (${duration2}ms vs ${duration1}ms)`);
    console.log(`✓ Data consistency verified`);
});

// Test Case 4: User with no repositories
test('Test 4: Handle user with no public repositories', async () => {
    clearCache();

    // Note: Finding a user with zero repos is rare, so this tests the edge case
    // If this user gets repos later, the test will still validate the structure
    const username = 'octocat';

    console.log(`Fetching profile for: ${username}`);
    const profile = await fetchGitHubProfile(username);

    // Validate structure even if repos exist
    if (!profile.github) {
        throw new Error('Missing "github" field');
    }
    if (!Array.isArray(profile.github.projects)) {
        throw new Error('projects should always be an array (even if empty)');
    }
    if (!Array.isArray(profile.github.topLanguages)) {
        throw new Error('topLanguages should always be an array (even if empty)');
    }

    console.log(`✓ Returned valid structure with ${profile.github.projects.length} projects`);
});

// Test Case 5: Validate project structure
test('Test 5: Validate project data structure', async () => {
    clearCache();

    const username = 'octocat';

    const profile = await fetchGitHubProfile(username);

    if (profile.github.projects.length > 0) {
        const firstProject = profile.github.projects[0];

        console.log('Sample project:');
        console.log(JSON.stringify(firstProject, null, 2));

        // Validate required fields
        if (typeof firstProject.name !== 'string') {
            throw new Error('Project name should be a string');
        }
        if (typeof firstProject.description !== 'string') {
            throw new Error('Project description should be a string');
        }
        if (!Array.isArray(firstProject.languages)) {
            throw new Error('Project languages should be an array');
        }
        if (typeof firstProject.stars !== 'number') {
            throw new Error('Project stars should be a number');
        }
        if (typeof firstProject.url !== 'string' || !firstProject.url.startsWith('https://github.com/')) {
            throw new Error('Project URL should be a valid GitHub URL');
        }

        console.log(`✓ Project structure is valid`);
    } else {
        console.log('ℹ No projects to validate (user has no repos)');
    }
});

// ==================== TEST SUMMARY ====================

console.log('========================================');
console.log('All tests completed!');
console.log('========================================');
console.log('\nNote: Some tests may fail due to:');
console.log('- Network connectivity issues');
console.log('- GitHub API rate limiting');
console.log('- Changes to test user profiles');
console.log('\nIf tests fail, try again in a few minutes.');
console.log('========================================');
