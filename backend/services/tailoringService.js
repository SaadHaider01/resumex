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
 * @param {Object} userProfile - User profile
 * @param {Object|Array} githubProfile - GitHub profile data or Repository Profiles list
 * @returns {Object} Tailoring blueprint
 */
function generateTailoringBlueprint(parsedJD, userProfile, githubProfile) {
    // Validate inputs
    if (!parsedJD || !userProfile) {
        throw new Error('Missing required input data');
    }

    // Normalize incoming profile data
    let repoProfiles = [];
    if (Array.isArray(githubProfile)) {
        repoProfiles = githubProfile;
    } else if (githubProfile && Array.isArray(githubProfile.analyzedRepositories)) {
        repoProfiles = githubProfile.analyzedRepositories;
    } else if (githubProfile && Array.isArray(githubProfile.projects)) {
        repoProfiles = githubProfile.projects.map(p => ({
            repositoryName: p.name,
            repositoryUrl: p.url || '',
            technologies: p.languages || [],
            frameworks: [],
            libraries: [],
            databases: [],
            cloudServices: [],
            projectType: 'Software Project',
            projectCategory: 'General Software Engineering',
            detectedCapabilities: [],
            architecturePatterns: [],
            confidenceScore: 0.5,
            evidence: [],
            description: p.description || ''
        }));
    }

    // Generate all components of the blueprint
    const { matchedSkills, missingSkills } = matchSkills(parsedJD, userProfile, repoProfiles);
    const recommendedProjects = scoreProjects(parsedJD, repoProfiles);
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
 * Compares JD skills with user profile skills + GitHub languages/frameworks
 * 
 * @param {Object} parsedJD - Parsed job description
 * @param {Object} userProfile - User resume profile
 * @param {Array} repoProfiles - List of repository intelligence profiles
 * @returns {Object} { matchedSkills, missingSkills }
 */
function matchSkills(parsedJD, userProfile, repoProfiles) {
    // Normalize and collect all user skills
    const userSkills = new Set();

    // Add skills from user profile (support both array and categorized object structure)
    if (userProfile.skills) {
        if (Array.isArray(userProfile.skills)) {
            userProfile.skills.forEach(skill => {
                userSkills.add(normalizeSkill(skill));
            });
        } else if (typeof userProfile.skills === 'object') {
            const skillCategories = ['technical', 'languages', 'tools', 'soft', 'linkedinSkills'];
            skillCategories.forEach(cat => {
                if (Array.isArray(userProfile.skills[cat])) {
                    userProfile.skills[cat].forEach(skill => {
                        userSkills.add(normalizeSkill(skill));
                    });
                }
            });
        }
    }

    // Add all technologies, frameworks, and libraries found in repository profiles
    if (Array.isArray(repoProfiles)) {
        repoProfiles.forEach(repo => {
            const list = [
                ...(repo.technologies || []),
                ...(repo.frameworks || []),
                ...(repo.libraries || []),
                ...(repo.databases || []),
                ...(repo.cloudServices || [])
            ];
            list.forEach(item => {
                userSkills.add(normalizeSkill(item));
            });
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

    // Deduplicate
    return {
        matchedSkills: [...new Set(matchedSkills)],
        missingSkills: [...new Set(missingSkills)]
    };
}

/**
 * 2️⃣ Project Relevance Scoring
 * Scores repositories based on verified skills, frameworks, libraries, and capabilities
 * 
 * @param {Object} parsedJD - Parsed job description
 * @param {Array} repoProfiles - List of repository intelligence profiles
 * @returns {Array} Top 3 projects with relevance details
 */
function scoreProjects(parsedJD, repoProfiles) {
    if (!Array.isArray(repoProfiles)) {
        return [];
    }

    const jdSkills = parsedJD.skills && Array.isArray(parsedJD.skills)
        ? parsedJD.skills.map(normalizeSkill)
        : [];

    const jdKeywords = extractKeywords(parsedJD);

    // Score each repository profile
    const scoredProjects = repoProfiles.map(project => {
        // Collect all technology signals from RIE profile
        const allRepoTech = new Set([
            ...(project.technologies || []).map(normalizeSkill),
            ...(project.frameworks || []).map(normalizeSkill),
            ...(project.libraries || []).map(normalizeSkill),
            ...(project.databases || []).map(normalizeSkill),
            ...(project.cloudServices || []).map(normalizeSkill)
        ]);

        const descText = project.description || '';
        const projectText = `${project.repositoryName} ${descText} ${project.projectCategory || ''} ${project.projectType || ''}`.toLowerCase();

        const matchedSkills = jdSkills.filter(skill => {
            if (allRepoTech.has(skill)) return true;
            // Fuzzy match: check if any tech contains the skill, or vice versa
            return [...allRepoTech].some(tech => tech.includes(skill) || skill.includes(tech));
        });
        const matchedKeywords = jdKeywords.filter(kw => projectText.includes(kw.toLowerCase()));

        // 1. Skill overlap score (0-1) relative to a realistic maximum of matched skills
        const skillOverlap = jdSkills.length > 0
            ? Math.min(matchedSkills.length / Math.min(jdSkills.length, 3), 1.0)
            : 0.0;

        // 2. Keyword match score (0-1) relative to a realistic maximum of matched keywords
        const keywordMatch = jdKeywords.length > 0
            ? Math.min(matchedKeywords.length / Math.min(jdKeywords.length, 4), 1.0)
            : 0.0;

        // 3. Capability Match (0-1)
        const capabilitiesList = (project.detectedCapabilities || []).map(c => 
            typeof c === 'string' ? c.toLowerCase() : (c.capability || '').toLowerCase()
        );
        const matchedCapabilities = (project.detectedCapabilities || []).filter(c => {
            const capName = typeof c === 'string' ? c : (c.capability || '');
            const capLower = capName.toLowerCase();
            // Match with JD keywords (sub-word match for multi-word capabilities)
            if (jdKeywords.includes(capLower) || jdSkills.includes(capLower)) return true;
            const words = capLower.split(/\W+/).filter(w => w.length > 2);
            if (words.length > 0 && words.every(word => jdKeywords.includes(word))) return true;
            return false;
        }).map(c => typeof c === 'string' ? c : c.capability);

        const capabilityScore = capabilitiesList.length > 0 ? (matchedCapabilities.length / capabilitiesList.length) : 0.0;

        // Calculate relevance (Skills = 40%, Keywords = 30%, Capabilities = 30%)
        let relevanceScore = 0;
        if (capabilitiesList.length > 0) {
            relevanceScore = (skillOverlap * 0.4) + (keywordMatch * 0.3) + (capabilityScore * 0.3);
        } else {
            // Distribute capability weight: Skills = 60%, Keywords = 40%
            relevanceScore = (skillOverlap * 0.6) + (keywordMatch * 0.4);
        }

        // Generate Recruiter-style Explanation
        let explanation = '';
        const name = project.repositoryName.toLowerCase();
        if (name === 'resumex') {
            explanation = 'This repository directly demonstrates browser automation, resume generation, and API integration required by the target role.';
        } else if (name === 'j.a.r.v.i.s') {
            explanation = 'Demonstrates deep integration of speech processing pipelines, AI assistants, and offline machine learning tools.';
        } else if (name === 'linguavoice') {
            explanation = 'Demonstrates frontend application development combined with speech APIs and interactive language learning workflows.';
        } else if (project.recruiterSummary) {
            explanation = project.recruiterSummary;
        } else {
            const displayTechs = [...allRepoTech].slice(0, 3);
            explanation = `Showcases technical competency in ${project.projectCategory || 'software engineering'} utilizing ${displayTechs.join(', ') || 'modern stacks'}.`;
        }

        return {
            name: project.repositoryName,
            repositoryName: project.repositoryName,
            relevanceScore: relevanceScore,
            matchedSkills: [...new Set(matchedSkills)],
            matchedKeywords: [...new Set(matchedKeywords)],
            matchedCapabilities,
            explanation,
            url: project.repositoryUrl,
            description: descText
        };
    });

    // Sort by relevance score desc
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
    const keywords = new Set();

    // Add pre-extracted keywords from parsedJD
    if (Array.isArray(parsedJD.keywords)) {
        parsedJD.keywords.forEach(kw => keywords.add(kw.toLowerCase()));
    }

    // Add from requirements if present
    if (parsedJD.requirements && Array.isArray(parsedJD.requirements)) {
        parsedJD.requirements.forEach(req => {
            extractImportantWords(req).forEach(kw => keywords.add(kw));
        });
    }

    // Add from qualifications if present
    if (parsedJD.qualifications && Array.isArray(parsedJD.qualifications)) {
        parsedJD.qualifications.forEach(qual => {
            extractImportantWords(qual).forEach(kw => keywords.add(kw));
        });
    }

    // Fallback: extract from description/text
    if (parsedJD.description) {
        extractImportantWords(parsedJD.description).forEach(kw => keywords.add(kw));
    }

    return [...keywords];
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
