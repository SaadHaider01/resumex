/**
 * Resume Generator Service
 * 
 * Orchestrates the full pipeline:
 * JD → Parser → GitHub → Tailoring → AI Generator
 * 
 * NO route logic - pure service layer
 * 
 * @module resumeGenerator
 */

const { parseJobDescription } = require('./jdParser');
const { fetchGitHubProfile } = require('./githubService');
const { generateTailoringBlueprint } = require('./tailoringService');
const { analyzeRepositories } = require('./repositoryIntelligenceService');

/**
 * Generates a tailored resume using the full pipeline
 * 
 * @param {string} jobDescription - Raw job description text
 * @param {Object} userProfile - User resume profile
 * @param {string} githubUsername - GitHub username (optional)
 * @param {Function} llmCallFn - Function to call LLM (injected for testability)
 * @returns {Promise<Object>} Generated resume
 */
async function generateTailoredResume(jobDescription, userProfile, githubUsername, llmCallFn) {
    // Step 1: Parse job description
    const parsedJD = parseJobDescription(jobDescription);

    // Step 2: Fetch/resolve GitHub repositories
    let githubProfile = {
        topLanguages: [],
        projects: [],
        stats: {
            totalRepos: 0,
            totalStars: 0,
            totalCommits: 0
        }
    };

    const hasCachedGithub = userProfile && userProfile.projects && userProfile.projects.length > 0;
    if (hasCachedGithub) {
        githubProfile = {
            topLanguages: userProfile.skills?.languages || [],
            projects: userProfile.projects,
            stats: { totalRepos: userProfile.projects.length, totalStars: 0, totalCommits: 0 }
        };
    } else if (githubUsername) {
        try {
            githubProfile = await fetchGitHubProfile(githubUsername);
        } catch (error) {
            console.warn('GitHub profile fetch failed, continuing without GitHub data:', error.message);
        }
    }

    // Step 2.5: Analyze repositories using RIE (Repository Intelligence Engine)
    let repoIntelligence = { analyzedRepositories: [] };
    if (githubProfile && githubProfile.projects && githubProfile.projects.length > 0) {
        try {
            const usernameForRIE = githubUsername || userProfile?.personalInfo?.githubUsername || 'SaadHaider01';
            repoIntelligence = await analyzeRepositories({
                githubUsername: usernameForRIE,
                repositories: githubProfile.projects
            });
        } catch (err) {
            console.warn('Repository intelligence analysis failed:', err.message);
        }
    }

    // Deep copy and enrich userProfile with RIE profiles
    const enrichedProfile = JSON.parse(JSON.stringify(userProfile || {}));
    if (repoIntelligence.analyzedRepositories.length > 0) {
        enrichedProfile.projects = repoIntelligence.analyzedRepositories;
    }

    // Step 3: Generate tailoring blueprint using RIE profiles
    const tailoringBlueprint = generateTailoringBlueprint(parsedJD, enrichedProfile, repoIntelligence);

    // Step 4: Create enhanced prompt with blueprint
    const enhancedPrompt = createBlueprintEnhancedPrompt({
        jobDescription,
        parsedJD,
        userProfile: enrichedProfile,
        githubProfile: repoIntelligence,
        tailoringBlueprint
    });

    // Step 5: Call LLM
    const resume = await llmCallFn(enhancedPrompt);

    return {
        resume,
        metadata: {
            parsedJD,
            githubProfile: repoIntelligence,
            tailoringBlueprint
        }
    };
}

/**
 * Creates a blueprint-enhanced prompt for the LLM
 * 
 * @param {Object} data - Combined pipeline data
 * @returns {string} Enhanced prompt
 */
function createBlueprintEnhancedPrompt(data) {
    const { jobDescription, parsedJD, userProfile, githubProfile, tailoringBlueprint } = data;
    const { matchedSkills, missingSkills, recommendedProjects, experienceMatchLevel, keywordInjectionList } = tailoringBlueprint;

    // Determine tone based on experience match
    const toneGuidance = getToneGuidance(experienceMatchLevel);

    return `You are an expert resume writer and ATS (Applicant Tracking System) optimization specialist.

Your task is to create a tailored, ATS-optimized resume based on the job description and user profile provided below.

CRITICAL REQUIREMENTS:
1. Tailor the resume specifically to match the job requirements
2. Use keywords from the job description naturally throughout the resume
3. Optimize for ATS parsing (clear structure, standard section headers, no complex formatting)
4. Highlight the most relevant experience and skills first
5. Quantify achievements wherever possible
6. Keep professional summary concise (2-3 sentences)
7. Use action verbs to start each bullet point
8. Return ONLY valid JSON, no additional text or explanation

JOB DESCRIPTION:
${jobDescription}

USER PROFILE:
${JSON.stringify(userProfile, null, 2)}

GITHUB PROFILE:
${JSON.stringify(githubProfile, null, 2)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 TAILORING INTELLIGENCE (Use This to Guide Resume Generation)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ MATCHED SKILLS (Highlight These Prominently):
${matchedSkills.length > 0 ? matchedSkills.join(', ') : 'None identified'}

⚠️ MISSING SKILLS (Incorporate Subtly if Transferable):
${missingSkills.length > 0 ? missingSkills.join(', ') : 'None identified'}

🚀 RECOMMENDED PROJECTS (Prioritize These):
${formatRecommendedProjects(recommendedProjects)}

🔑 KEYWORD INJECTION LIST (Use Naturally Throughout):
${keywordInjectionList.slice(0, 20).join(', ')}

📊 EXPERIENCE MATCH LEVEL: ${experienceMatchLevel}
${toneGuidance}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "personalInfo": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "linkedin": "string (optional)",
    "github": "string (optional)"
  },
  "professionalSummary": "string (2-3 sentences tailored to the job)",
  "skills": {
    "technical": ["array of relevant technical skills from job description"],
    "tools": ["array of relevant tools"],
    "soft": ["array of relevant soft skills if mentioned in job"]
  },
  "experience": [
    {
      "company": "string",
      "position": "string",
      "duration": "string",
      "location": "string",
      "achievements": ["array of 3-5 tailored bullet points with metrics"]
    }
  ],
  "education": [
    {
      "degree": "string",
      "institution": "string",
      "graduation": "string",
      "gpa": "string (optional)"
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "technologies": ["array"],
      "highlights": ["array of 2-3 key achievements"]
    }
  ],
  "certifications": ["array of relevant certifications"]
}

TAILORING STRATEGY:
1. **Skills Section**: Prioritize MATCHED SKILLS at the top of the technical skills list
2. **Projects Section**: Include RECOMMENDED PROJECTS first, emphasizing their relevance scores
3. **Keyword Integration**: Naturally weave in keywords from KEYWORD INJECTION LIST throughout achievements and descriptions
4. **Experience Bullet Points**: Rewrite to highlight experiences that match the job requirements
5. **Professional Summary**: Incorporate matched skills and align with experience match level
6. **Missing Skills**: If user has transferable skills or related experience, mention them contextually
7. **Tone**: ${toneGuidance}

Generate the tailored resume now:`;
}

/**
 * Formats recommended projects for prompt
 * @param {Array} projects - Recommended projects
 * @returns {string} Formatted string
 */
function formatRecommendedProjects(projects) {
    if (projects.length === 0) {
        return 'None identified';
    }

    return projects
        .map((p, idx) => `${idx + 1}. ${p.name} (Relevance: ${(p.relevanceScore * 100).toFixed(0)}%)`)
        .join('\n');
}

/**
 * Gets tone guidance based on experience match level
 * @param {string} experienceMatchLevel - "High", "Moderate", or "Low"
 * @returns {string} Tone guidance
 */
function getToneGuidance(experienceMatchLevel) {
    switch (experienceMatchLevel) {
        case 'High':
            return '📈 Tone: Confident and results-driven. Emphasize leadership, impact, and senior-level contributions.';
        case 'Moderate':
            return '📊 Tone: Balanced and growth-oriented. Emphasize learning agility, relevant achievements, and potential.';
        case 'Low':
            return '📉 Tone: Eager and adaptive. Emphasize transferable skills, quick learning, and enthusiasm for the role.';
        default:
            return '📊 Tone: Professional and achievement-focused.';
    }
}

module.exports = {
    generateTailoredResume,
    createBlueprintEnhancedPrompt
};
