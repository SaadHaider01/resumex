require('dotenv').config({ override: true });
const express = require('express');
const cors = require('cors');
const { initializeProvider } = require('./services/llmProvider');
const { createResumePrompt } = require('./promptTemplate');
const mockUserProfile = require('./mockData');
const { parseJobDescription } = require('./services/jdParser');
const { fetchGitHubProfile } = require('./services/githubService');
const { fetchLinkedInProfile } = require('./services/linkedinService');
const { generateTailoringBlueprint } = require('./services/tailoringService');
const { connectDB } = require('./config/database');
const resumeVaultRoutes = require('./routes/resumeVaultRoutes');

const app = express();
const PORT = process.env.PORT || 4000;

// Initialize LLM provider
let llmProvider;
try {
    const provider = process.env.LLM_PROVIDER || 'openai';
    
    let apiKey, model;
    if (provider === 'gemini') {
        apiKey = process.env.GEMINI_API_KEY;
        model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    } else if (provider === 'openrouter') {
        apiKey = process.env.OPENROUTER_API_KEY;
        model = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-lite-preview-02-05:free';
    } else {
        apiKey = process.env.OPENAI_API_KEY;
        model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    }

    llmProvider = initializeProvider({ provider, apiKey, model });
    console.log(`✅ LLM Provider initialized: ${llmProvider.name} (Model: ${model})`);
} catch (error) {
    console.error('❌ LLM Provider initialization failed:', error.message);
    process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
/*
connectDB().catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    console.log('⚠️  Server will run without database features');
});
*/

// Mount resume vault routes
app.use('/api', resumeVaultRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Resume Generator API is running' });
});

/**
 * POST /api/generate-resume
 * 
 * Request body:
 * {
 *   "jobDescription": "string (required)",
 *   "userProfile": "object (optional, will use mock data if not provided)"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "resume": { ... tailored resume object ... }
 * }
 */
app.post('/api/generate-resume', async (req, res) => {
    try {
        const { jobDescription, userProfile } = req.body;

        // Validation
        if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Job description is required and must be a non-empty string'
            });
        }

        // Use provided profile or fall back to mock data
        const profileToUse = userProfile || mockUserProfile;

        console.log('Generating resume for job description:', jobDescription.substring(0, 100) + '...');

        // Create the prompt
        const prompt = createResumePrompt(jobDescription, profileToUse);

        // Call LLM Provider
        const result = await llmProvider.generateText(prompt, {
            temperature: 0.7,
            responseFormat: 'json',
            systemPrompt: 'You are an expert resume writer specializing in ATS optimization. Always return valid JSON only, with no additional text or markdown formatting.'
        });

        // Parse the response
        const resumeText = result.text;
        let tailoredResume;

        try {
            tailoredResume = JSON.parse(resumeText);
        } catch (parseError) {
            console.error('Failed to parse AI response as JSON:', resumeText);
            return res.status(500).json({
                success: false,
                error: 'Failed to parse AI response',
                details: parseError.message
            });
        }

        // Return the tailored resume
        res.json({
            success: true,
            resume: tailoredResume,
            metadata: {
                model: result.model,
                tokensUsed: result.tokensUsed,
                provider: result.provider,
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error generating resume:', error);

        // Handle specific OpenAI errors
        if (error.status === 401) {
            return res.status(500).json({
                success: false,
                error: 'OpenAI API authentication failed. Please check your API key.'
            });
        }

        if (error.status === 429) {
            return res.status(429).json({
                success: false,
                error: 'OpenAI API rate limit exceeded. Please try again later.'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to generate resume',
            details: error.message
        });
    }
});

/**
 * POST /api/generate-tailored-resume
 * 
 * New endpoint using full pipeline with tailoring blueprint
 * 
 * Request body:
 * {
 *   "jobDescription": "string (required)",
 *   "userProfile": "object (optional)",
 *   "githubUsername": "string (optional)"
 * }
 */
app.post('/api/generate-tailored-resume', async (req, res) => {
    try {
        const { jobDescription, userProfile, githubUsername, linkedinProfile } = req.body;

        // Validation
        if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Job description is required and must be a non-empty string'
            });
        }

        const profileToUse = userProfile || mockUserProfile;

        console.log('🔄 Running full tailoring pipeline...');

        // Step 1: Parse job description
        console.log('  1️⃣ Parsing job description...');
        const parsedJD = parseJobDescription(jobDescription);

        // Step 2: Fetch GitHub profile (if provided)
        let githubProfile = {
            topLanguages: [],
            projects: [],
            stats: { totalRepos: 0, totalStars: 0, totalCommits: 0 }
        };

        if (githubUsername) {
            try {
                console.log(`  2️⃣ Fetching GitHub profile for: ${githubUsername}`);
                githubProfile = await fetchGitHubProfile(githubUsername);
            } catch (error) {
                console.warn(`  ⚠️ GitHub fetch failed: ${error.message}`);
            }
        } else {
            console.log('  2️⃣ No GitHub username provided, skipping...');
        }

        // Fetch LinkedIn profile (if provided)
        let linkedinData = null;
        if (linkedinProfile) {
            try {
                console.log(`  2.5️⃣ Fetching LinkedIn profile for: ${linkedinProfile}`);
                linkedinData = await fetchLinkedInProfile(linkedinProfile);
            } catch (error) {
                console.warn(`  ⚠️ LinkedIn fetch failed: ${error.message}`);
            }
        } else {
            console.log('  2.5️⃣ No LinkedIn profile provided, skipping...');
        }

        // Merge LinkedIn and GitHub data into profileToUse if available
        let finalProfileToUse = JSON.parse(JSON.stringify(profileToUse)); // Deep copy to avoid mutating mockData
        
        // Merge GitHub profile info first
        if (githubProfile && githubProfile.name) {
            console.log('  🤝 Merging GitHub user info into profile...');
            finalProfileToUse.personalInfo.name = githubProfile.name;
            if (githubProfile.email) finalProfileToUse.personalInfo.email = githubProfile.email;
            if (githubProfile.location) finalProfileToUse.personalInfo.location = githubProfile.location;
            if (githubProfile.bio) finalProfileToUse.summary = githubProfile.bio;
        }

        // Merge LinkedIn data (which takes precedence over GitHub info for job details)
        if (linkedinData) {
            console.log('  🤝 Merging LinkedIn data into user profile...');
            // Merge only non-empty personalInfo fields to avoid overwriting valid data with empty strings
            for (const key in linkedinData.personalInfo) {
                if (linkedinData.personalInfo[key]) {
                    finalProfileToUse.personalInfo[key] = linkedinData.personalInfo[key];
                }
            }
            finalProfileToUse.summary = linkedinData.summary || finalProfileToUse.summary;
            if (linkedinData.experience && linkedinData.experience.length) finalProfileToUse.experience = linkedinData.experience;
            if (linkedinData.education && linkedinData.education.length) finalProfileToUse.education = linkedinData.education;
            if (linkedinData.certifications && linkedinData.certifications.length) finalProfileToUse.certifications = linkedinData.certifications;
            if (linkedinData.rawSkills && linkedinData.rawSkills.length) {
                finalProfileToUse.skills.linkedinSkills = linkedinData.rawSkills;
            }
        }

        // Step 3: Generate tailoring blueprint
        console.log('  3️⃣ Generating tailoring blueprint...');
        const tailoringBlueprint = generateTailoringBlueprint(parsedJD, finalProfileToUse, githubProfile);

        // Step 4: Create enhanced prompt with blueprint
        console.log('  4️⃣ Creating blueprint-enhanced prompt...');
        const prompt = createResumePrompt(jobDescription, finalProfileToUse, tailoringBlueprint);

        // Call LLM Provider
        console.log('  5️⃣ Calling AI to generate tailored resume...');
        const result = await llmProvider.generateText(prompt, {
            temperature: 0.7,
            responseFormat: 'json',
            systemPrompt: 'You are an expert resume writer specializing in ATS optimization. Always return valid JSON only, with no additional text or markdown formatting.'
        });

        const resumeText = result.text;
        let tailoredResume;

        try {
            tailoredResume = JSON.parse(resumeText);
        } catch (parseError) {
            console.error('Failed to parse AI response as JSON:', resumeText);
            return res.status(500).json({
                success: false,
                error: 'Failed to parse AI response',
                details: parseError.message
            });
        }

        console.log('✅ Resume generation complete!');

        res.json({
            success: true,
            resume: tailoredResume,
            metadata: {
                model: result.model,
                tokensUsed: result.tokensUsed,
                provider: result.provider,
                generatedAt: new Date().toISOString()
            },
            tailoringData: {
                parsedJD: {
                    skillsFound: parsedJD.skills.length,
                    requirementsFound: parsedJD.requirements.length
                },
                blueprint: {
                    matchedSkills: tailoringBlueprint.matchedSkills,
                    missingSkills: tailoringBlueprint.missingSkills,
                    recommendedProjects: tailoringBlueprint.recommendedProjects.map(p => p.name),
                    experienceMatchLevel: tailoringBlueprint.experienceMatchLevel
                }
            }
        });

    } catch (error) {
        console.error(`❌ Error in tailored resume generation (${llmProvider?.name}):`, error);

        const status = error.status || 500;
        const message = error.message || 'Failed to generate tailored resume';

        res.status(status).json({
            success: false,
            error: `LLM Provider Error (${llmProvider?.name}): ${message}`,
            details: error.details || error.stack
        });
    }
});

/**
 * POST /api/generate-cover-letter
 * 
 * Generate tailored cover letter using the active LLM provider
 */
app.post('/api/generate-cover-letter', async (req, res) => {
    try {
        const { jobDescription, tailoringBlueprint, resumeJSON, company, jobTitle } = req.body;

        // Validation
        if (!jobDescription || !tailoringBlueprint || !resumeJSON || !company || !jobTitle) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: jobDescription, tailoringBlueprint, resumeJSON, company, jobTitle'
            });
        }

        console.log(`📝 Generating cover letter for ${jobTitle} at ${company}...`);

        // Create cover letter prompt
        const prompt = createResumePrompt ? require('./promptTemplate').createCoverLetterPrompt({
            jobDescription,
            tailoringBlueprint,
            resumeJSON,
            company,
            jobTitle
        }) : '';

        // Call LLM API (using provider abstraction)
        console.log('  🤖 Calling LLM API...');
        const result = await llmProvider.generateText(prompt, {
            temperature: 0.8,
            maxTokens: 1000,
            systemPrompt: 'You are an expert career consultant and cover letter writer. Write compelling, professional cover letters that align with the candidate\'s resume.'
        });

        const coverLetter = result.text.trim();

        console.log('  ✅ Cover letter generated successfully\n');

        res.json({
            success: true,
            coverLetter,
            metadata: {
                model: result.model,
                tokensUsed: result.tokensUsed,
                provider: result.provider,
                company,
                jobTitle,
                experienceMatchLevel: tailoringBlueprint.experienceMatchLevel,
                wordCount: coverLetter.split(/\s+/).length
            }
        });

    } catch (error) {
        console.error('Error generating cover letter:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Resume Generator API running on http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
    console.log(`🔧 Generate resume (basic): POST http://localhost:${PORT}/api/generate-resume`);
    console.log(`🎯 Generate resume (tailored): POST http://localhost:${PORT}/api/generate-tailored-resume`);
    console.log(`📝 Generate cover letter: POST http://localhost:${PORT}/api/generate-cover-letter`);
});
