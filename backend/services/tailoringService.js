/**
 * Tailoring Service - Core Intelligence Layer
 * 
 * Pure logic module for matching job requirements with user profile data.
 * NO Express routes, NO LLM calls - deterministic scoring only.
 * 
 * @module tailoringService
 */

/**
 * Main tailoring function - generates tailoring blueprint
 * 
 * @param {Object} parsedJD - Parsed job description from jdParser
 * @param {Object} userProfile - Mock resume profile
 * @param {Object} githubProfile - GitHub profile from githubService
 * @returns {Object} Tailoring blueprint
 */
function generateTailoringBlueprint(parsedJD, userProfile, githubProfile) {
    // Validate inputs
    if (!parsedJD || !userProfile || !githubProfile) {
        throw new Error('Missing required input data');
    }

    // Generate all components of the blueprint
    const { matchedSkills, missingSkills } = matchSkills(parsedJD, userProfile, githubProfile);
    const recommendedProjects = scoreProjects(parsedJD, githubProfile);
    const experienceMatchLevel = calculateExperienceMatch(parsedJD, userProfile);
    const keywordInjectionList = generateKeywordList(parsedJD, missingSkills);

    return {
        matchedSkills,
        missingSkills,
        recommendedProjects,
        experienceMatchLevel,
        keywordInjectionList
    };
}

/**
 * 1️⃣ Skill Matching
 * Compares JD skills with user profile skills + GitHub languages
 * 
 * @param {Object} parsedJD - Parsed job description
 * @param {Object} userProfile - User resume profile
 * @param {Object} githubProfile - GitHub profile data
 * @returns {Object} { matchedSkills, missingSkills }
 */
function matchSkills(parsedJD, userProfile, githubProfile) {
    // Normalize and collect all user skills
    const userSkills = new Set();

    // Add skills from user profile
    if (userProfile.skills && Array.isArray(userProfile.skills)) {
        userProfile.skills.forEach(skill => {
            userSkills.add(normalizeSkill(skill));
        });
    }

    // Add GitHub top languages
    if (githubProfile.topLanguages && Array.isArray(githubProfile.topLanguages)) {
        githubProfile.topLanguages.forEach(lang => {
            userSkills.add(normalizeSkill(lang));
        });
    }

    // Normalize JD skills
    const jdSkills = parsedJD.skills && Array.isArray(parsedJD.skills)
        ? parsedJD.skills.map(normalizeSkill)
        : [];

    // Find matches and missing skills
    const matchedSkills = [];
    const missingSkills = [];

    jdSkills.forEach(skill => {
        if (userSkills.has(skill)) {
            matchedSkills.push(skill);
        } else {
            missingSkills.push(skill);
        }
    });

    // Deduplicate (should be unnecessary with Set, but ensuring output is clean)
    return {
        matchedSkills: [...new Set(matchedSkills)],
        missingSkills: [...new Set(missingSkills)]
    };
}

/**
 * 2️⃣ Project Relevance Scoring
 * Scores GitHub projects based on skill overlap, keyword match, and star count
 * 
 * Formula: Relevance = (skillOverlap * 0.5) + (keywordMatch * 0.3) + (starWeight * 0.2)
 * 
 * @param {Object} parsedJD - Parsed job description
 * @param {Object} githubProfile - GitHub profile data
 * @returns {Array} Top 3 projects with relevance scores
 */
function scoreProjects(parsedJD, githubProfile) {
    if (!githubProfile.projects || !Array.isArray(githubProfile.projects)) {
        return [];
    }

    const jdSkills = parsedJD.skills && Array.isArray(parsedJD.skills)
        ? parsedJD.skills.map(normalizeSkill)
        : [];

    const jdKeywords = extractKeywords(parsedJD);

    // Score each project
    const scoredProjects = githubProfile.projects.map(project => {
        // Skill overlap score (0-1)
        const projectSkills = (project.languages || []).map(normalizeSkill);
        const skillOverlap = calculateOverlapScore(jdSkills, projectSkills);

        // Keyword match score (0-1)
        const projectText = `${project.name} ${project.description || ''}`.toLowerCase();
        const keywordMatch = calculateKeywordScore(jdKeywords, projectText);

        // Star weight score (0-1) - logarithmic scaling
        const starWeight = calculateStarScore(project.stars || 0);

        // Calculate total relevance
        const relevanceScore = (skillOverlap * 0.5) + (keywordMatch * 0.3) + (starWeight * 0.2);

        return {
            name: project.name,
            relevanceScore: Math.round(relevanceScore * 100) / 100, // Round to 2 decimals
            url: project.url,
            description: project.description
        };
    });

    // Sort by relevance and return top 3
    return scoredProjects
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 3);
}

/**
 * 3️⃣ Experience Match Level
 * Determines if user experience meets JD requirements
 * 
 * @param {Object} parsedJD - Parsed job description
 * @param {Object} userProfile - User resume profile
 * @returns {string} "High", "Moderate", or "Low"
 */
function calculateExperienceMatch(parsedJD, userProfile) {
    const requiredYears = parseExperienceYears(parsedJD.experience || '');
    const userYears = parseExperienceYears(userProfile.totalExperience || '');

    if (userYears === null || requiredYears === null) {
        return "Moderate"; // Default when experience data is unclear
    }

    // High: Meets or exceeds requirement
    if (userYears >= requiredYears) {
        return "High";
    }

    // Moderate: Within 1-2 years of requirement
    if (userYears >= requiredYears - 1) {
        return "Moderate";
    }

    // Low: Far below requirement
    return "Low";
}

/**
 * 4️⃣ Keyword Injection List
 * Collects important keywords from JD, missing skills, and tech terms
 * 
 * @param {Object} parsedJD - Parsed job description
 * @param {Array} missingSkills - Skills user is missing
 * @returns {Array} Deduplicated keyword list
 */
function generateKeywordList(parsedJD, missingSkills) {
    const keywords = new Set();

    // Add JD keywords
    const jdKeywords = extractKeywords(parsedJD);
    jdKeywords.forEach(kw => keywords.add(kw));

    // Add missing skills (these are important to mention if possible)
    missingSkills.forEach(skill => keywords.add(skill));

    // Add important tech terms from JD description
    if (parsedJD.description) {
        const techTerms = extractTechTerms(parsedJD.description);
        techTerms.forEach(term => keywords.add(term));
    }

    return [...keywords];
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Normalizes skill name for comparison
 * @param {string} skill - Raw skill name
 * @returns {string} Normalized skill name
 */
function normalizeSkill(skill) {
    return skill.toString().toLowerCase().trim();
}

/**
 * Calculates overlap score between two arrays
 * @param {Array} arr1 - First array
 * @param {Array} arr2 - Second array
 * @returns {number} Score between 0 and 1
 */
function calculateOverlapScore(arr1, arr2) {
    if (arr1.length === 0) return 0;

    const set2 = new Set(arr2);
    const matches = arr1.filter(item => set2.has(item)).length;

    return matches / arr1.length;
}

/**
 * Calculates keyword match score
 * @param {Array} keywords - Keywords to search for
 * @param {string} text - Text to search in
 * @returns {number} Score between 0 and 1
 */
function calculateKeywordScore(keywords, text) {
    if (keywords.length === 0) return 0;

    const matches = keywords.filter(kw => text.includes(kw.toLowerCase())).length;

    return matches / keywords.length;
}

/**
 * Calculates star score with logarithmic scaling
 * @param {number} stars - Number of GitHub stars
 * @returns {number} Score between 0 and 1
 */
function calculateStarScore(stars) {
    if (stars <= 0) return 0;

    // Logarithmic scaling: 1 star = 0.1, 10 stars = 0.5, 100+ stars = 1.0
    const score = Math.log10(stars + 1) / 2;

    return Math.min(score, 1.0);
}

/**
 * Extracts keywords from parsed JD
 * @param {Object} parsedJD - Parsed job description
 * @returns {Array} Array of keywords
 */
function extractKeywords(parsedJD) {
    const keywords = [];

    // Add from requirements
    if (parsedJD.requirements && Array.isArray(parsedJD.requirements)) {
        parsedJD.requirements.forEach(req => {
            const words = extractImportantWords(req);
            keywords.push(...words);
        });
    }

    // Add from qualifications
    if (parsedJD.qualifications && Array.isArray(parsedJD.qualifications)) {
        parsedJD.qualifications.forEach(qual => {
            const words = extractImportantWords(qual);
            keywords.push(...words);
        });
    }

    return [...new Set(keywords)]; // Deduplicate
}

/**
 * Extracts important words from a sentence
 * @param {string} sentence - Input sentence
 * @returns {Array} Important words
 */
function extractImportantWords(sentence) {
    // Common stop words to filter out
    const stopWords = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
        'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
    ]);

    return sentence
        .toLowerCase()
        .split(/\W+/)
        .filter(word => word.length > 3 && !stopWords.has(word));
}

/**
 * Extracts technical terms from description
 * @param {string} description - Job description text
 * @returns {Array} Technical terms
 */
function extractTechTerms(description) {
    const techPatterns = [
        /\b(api|rest|graphql|microservices|scalable|cloud-native|devops|ci\/cd|agile|scrum)\b/gi,
        /\b(database|sql|nosql|mongodb|postgresql|redis|elasticsearch)\b/gi,
        /\b(docker|kubernetes|aws|azure|gcp|jenkins|terraform)\b/gi,
        /\b(frontend|backend|full-stack|mobile|web|responsive)\b/gi
    ];

    const terms = new Set();

    techPatterns.forEach(pattern => {
        const matches = description.match(pattern);
        if (matches) {
            matches.forEach(match => terms.add(match.toLowerCase()));
        }
    });

    return [...terms];
}

/**
 * Parses experience years from text
 * @param {string} experienceText - Experience description
 * @returns {number|null} Years of experience or null if unclear
 */
function parseExperienceYears(experienceText) {
    if (!experienceText) return null;

    // Look for patterns like "3+ years", "5-7 years", "3 years"
    const patterns = [
        /(\d+)\+?\s*(?:years?|yrs?)/i,
        /(\d+)\s*-\s*\d+\s*(?:years?|yrs?)/i
    ];

    for (const pattern of patterns) {
        const match = experienceText.match(pattern);
        if (match) {
            return parseInt(match[1], 10);
        }
    }

    return null;
}

// ==================== EXPORTS ====================

module.exports = {
    generateTailoringBlueprint,
    // Export individual functions for testing
    matchSkills,
    scoreProjects,
    calculateExperienceMatch,
    generateKeywordList
};
