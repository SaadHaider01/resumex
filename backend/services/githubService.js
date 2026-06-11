/**
 * GitHub Profile Aggregation Service
 * 
 * Fetches public GitHub data and normalizes it into a structured profile.
 * Uses GitHub Public REST API with no external dependencies.
 * 
 * NO database, NO scraping - pure API calls only
 */

const https = require('https');

// In-memory cache to avoid excessive API calls
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Main function to fetch and normalize GitHub profile
 * @param {string} username - GitHub username
 * @returns {Promise<object>} Normalized profile data
 */
async function fetchGitHubProfile(username) {
    if (!username || typeof username !== 'string') {
        throw new Error('GitHub username is required and must be a string');
    }

    // Check cache first
    const cached = getFromCache(username);
    if (cached) {
        console.log(`📦 Cache hit for ${username}`);
        return cached;
    }

    try {
        console.log(`🔍 Fetching GitHub profile for: ${username}`);

        // Fetch user details and public repositories in parallel
        const [userData, repos] = await Promise.all([
            fetchGitHubUserData(username),
            fetchUserRepos(username)
        ]);

        if (!repos || repos.length === 0) {
            return {
                username,
                name: userData?.name || '',
                email: userData?.email || '',
                location: userData?.location || '',
                bio: userData?.bio || '',
                topLanguages: [],
                projects: [],
                totalRepos: 0
            };
        }

        // Normalize the data
        const normalizedProfile = await normalizeGitHubData(username, repos, userData);

        // Cache the result
        setCache(username, normalizedProfile);

        return normalizedProfile;

    } catch (error) {
        if (error.statusCode === 404) {
            throw new Error(`GitHub user '${username}' not found`);
        }
        if (error.statusCode === 403) {
            throw new Error('GitHub API rate limit exceeded. Please try again later.');
        }
        throw new Error(`Failed to fetch GitHub profile: ${error.message}`);
    }
}

async function fetchGitHubUserData(username) {
    try {
        const response = await fetch(`https://api.github.com/users/${username}`, {
            method: 'GET',
            headers: {
                'User-Agent': 'ResumeX-Profile-Aggregator',
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            return null;
        }
        
        return await response.json();
    } catch (error) {
        return null;
    }
}

async function fetchUserRepos(username) {
    try {
        const response = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, {
            method: 'GET',
            headers: {
                'User-Agent': 'ResumeX-Profile-Aggregator',
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            const error = new Error(`GitHub API returned status ${response.status}`);
            error.statusCode = response.status;
            throw error;
        }
        
        return await response.json();
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }
        throw new Error(`Network error: ${error.message}`);
    }
}

/**
 * Fetch languages for a specific repository
 */
async function fetchRepoLanguages(owner, repoName) {
    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}/languages`, {
            method: 'GET',
            headers: {
                'User-Agent': 'ResumeX-Profile-Aggregator',
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            return {};
        }
        
        return await response.json();
    } catch (error) {
        return {};
    }
}

/**
 * Normalize GitHub data into our profile schema
 */
async function normalizeGitHubData(username, repos, userData) {
    // Filter out forks (optional - focuses on original work)
    const ownRepos = repos.filter(repo => !repo.fork);

    // Aggregate languages across all repos
    const languageCounts = {};

    // Extract basic repo info first
    const projects = await Promise.all(
        ownRepos.slice(0, 20).map(async (repo) => {
            // Fetch detailed language data for each repo
            const languages = await fetchRepoLanguages(repo.owner.login, repo.name);
            const repoLanguages = Object.keys(languages);

            // Accumulate language counts
            for (const lang in languages) {
                languageCounts[lang] = (languageCounts[lang] || 0) + languages[lang];
            }

            return {
                name: repo.name,
                description: repo.description || 'No description available',
                languages: repoLanguages,
                stars: repo.stargazers_count || 0,
                url: repo.html_url
            };
        })
    );

    // Calculate top languages
    const topLanguages = Object.entries(languageCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([lang]) => lang);

    return {
        username,
        name: userData?.name || '',
        email: userData?.email || '',
        location: userData?.location || '',
        bio: userData?.bio || '',
        topLanguages,
        projects: projects.sort((a, b) => b.stars - a.stars), // Sort by stars
        totalRepos: repos.length
    };
}

/**
 * Cache management
 */
function getFromCache(username) {
    const cached = cache.get(username);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    cache.delete(username);
    return null;
}

function setCache(username, data) {
    cache.set(username, {
        data,
        timestamp: Date.now()
    });
}

/**
 * Clear cache (for testing)
 */
function clearCache() {
    cache.clear();
}

module.exports = {
    fetchGitHubProfile,
    clearCache
};
