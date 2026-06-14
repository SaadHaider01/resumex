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
const { analyzeRepositories } = require('./services/repositoryIntelligenceService');
const { connectDB } = require('./config/database');
const resumeVaultRoutes = require('./routes/resumeVaultRoutes');

function parseJsonFromText(text) {
    if (!text || typeof text !== 'string') {
        throw new Error('Input must be a non-empty string');
    }

    let cleanText = text.trim();

    // Strip out markdown code blocks if present (```json or ```)
    const markdownRegex = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;
    const match = cleanText.match(markdownRegex);
    if (match) {
        cleanText = match[1].trim();
    }

    try {
        return JSON.parse(cleanText);
    } catch (firstError) {
        // Fallback: search for first '{' and last '}' to extract JSON substring
        const start = cleanText.indexOf('{');
        const end = cleanText.lastIndexOf('}');
        
        if (start !== -1 && end !== -1 && end > start) {
            const extracted = cleanText.substring(start, end + 1);
            try {
                return JSON.parse(extracted);
            } catch (secondError) {
                throw new Error(`Failed to parse extracted JSON: ${secondError.message}. Content was: ${extracted}`);
            }
        }
        throw firstError;
    }
}

function cleanTailoredResume(tailoredResume, originalProfile) {
    if (!tailoredResume || !originalProfile) return tailoredResume;

    const normalize = str => {
        if (!str || typeof str !== 'string') return '';
        return str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    };

    const matchesAny = (value, list) => {
        if (!value || !list || list.length === 0) return false;
        const val = normalize(value);
        return list.some(item => {
            if (!item) return false;
            const cleanItem = normalize(item);
            return val.includes(cleanItem) || cleanItem.includes(val);
        });
    };

    // 1. Clean Experience
    // If originalProfile has no experiences, the tailored resume MUST have no experiences to prevent hallucinations.
    if (!originalProfile.experience || originalProfile.experience.length === 0) {
        tailoredResume.experience = [];
    } else {
        const originalCompanies = originalProfile.experience.map(exp => exp.company).filter(Boolean);
        tailoredResume.experience = (tailoredResume.experience || []).filter(exp =>
            matchesAny(exp.company, originalCompanies)
        );
    }

    // 2. Clean Education
    // If originalProfile has no education, the tailored resume MUST have no education.
    if (!originalProfile.education || originalProfile.education.length === 0) {
        tailoredResume.education = [];
    } else {
        const originalInstitutions = originalProfile.education.map(edu => edu.institution).filter(Boolean);
        tailoredResume.education = (tailoredResume.education || []).filter(edu =>
            matchesAny(edu.institution, originalInstitutions)
        );
    }

    // 3. Clean Projects
    // If originalProfile has no projects, the tailored resume MUST have no projects.
    if (!originalProfile.projects || originalProfile.projects.length === 0) {
        tailoredResume.projects = [];
    } else {
        const originalProjects = originalProfile.projects.map(proj => proj.name || proj.repositoryName).filter(Boolean);
        tailoredResume.projects = (tailoredResume.projects || []).filter(proj =>
            matchesAny(proj.name, originalProjects)
        );

        // Clean technologies for each remaining project to prevent technology hallucination (e.g. adding Python/Pandas to TypeScript/React)
        tailoredResume.projects.forEach(proj => {
            const originalProj = originalProfile.projects.find(op => 
                normalize(op.name || op.repositoryName) === normalize(proj.name)
            );
            if (originalProj) {
                const allowedTech = new Set([
                    ...(originalProj.technologies || []),
                    ...(originalProj.frameworks || []),
                    ...(originalProj.libraries || []),
                    ...(originalProj.databases || []),
                    ...(originalProj.cloudServices || []),
                    ...(originalProj.languages || [])
                ].map(t => normalize(t)).filter(Boolean));

                if (proj.technologies && Array.isArray(proj.technologies)) {
                    proj.technologies = proj.technologies.filter(tech => {
                        const normTech = normalize(tech);
                        return Array.from(allowedTech).some(at => 
                            normTech.includes(at) || at.includes(normTech)
                        );
                    });
                }
            }
        });
    }

    // 4. Clean Certifications
    if (!originalProfile.certifications || originalProfile.certifications.length === 0) {
        tailoredResume.certifications = [];
    } else {
        const originalCerts = originalProfile.certifications.filter(Boolean);
        tailoredResume.certifications = (tailoredResume.certifications || []).filter(cert =>
            matchesAny(cert, originalCerts)
        );
    }

    return tailoredResume;
}

function fillEmptyProfileSections(profile, defaultProfile) {
    if (!profile) {
        // If no profile at all, return only personalInfo and skills from default.
        // NEVER inject mock experience, education, projects, or certifications.
        return {
            personalInfo: JSON.parse(JSON.stringify(defaultProfile.personalInfo)),
            skills: JSON.parse(JSON.stringify(defaultProfile.skills)),
            experience: [],
            education: [],
            projects: [],
            certifications: []
        };
    }

    const filled = JSON.parse(JSON.stringify(profile));

    // --- personalInfo: fill only missing atomic fields (safe defaults) ---
    if (!filled.personalInfo) {
        filled.personalInfo = JSON.parse(JSON.stringify(defaultProfile.personalInfo));
    } else {
        if (!filled.personalInfo.name) filled.personalInfo.name = defaultProfile.personalInfo.name;
        // Do NOT auto-fill email/phone from mock — those come from extension settings
        if (!filled.personalInfo.location) filled.personalInfo.location = '';
    }

    // --- skills: normalize flat array (from LinkedIn scraper) or object form ---
    if (Array.isArray(filled.skills)) {
        // LinkedIn scraper returns a flat array — promote to categorized object
        const flatSkills = filled.skills.filter(Boolean);
        filled.skills = {
            technical: flatSkills.length > 0 ? flatSkills : (defaultProfile.skills.technical || []),
            tools: defaultProfile.skills.tools || [],
            soft: defaultProfile.skills.soft || []
        };
    } else if (!filled.skills || typeof filled.skills !== 'object') {
        filled.skills = JSON.parse(JSON.stringify(defaultProfile.skills));
    } else {
        // Object form — fill only the missing sub-arrays
        if (!filled.skills.technical || filled.skills.technical.length === 0) {
            filled.skills.technical = defaultProfile.skills.technical || [];
        }
        if (!filled.skills.tools || filled.skills.tools.length === 0) {
            filled.skills.tools = defaultProfile.skills.tools || [];
        }
    }

    // --- PERSONAL HISTORY: NEVER inject mock data ---
    // experience, education, projects, certifications are biographical facts.
    // Leaving them empty is correct — the LLM will generate a resume that honestly
    // reflects a candidate with only skills and GitHub projects.
    if (!Array.isArray(filled.experience))   filled.experience   = [];
    if (!Array.isArray(filled.education))    filled.education    = [];
    if (!Array.isArray(filled.projects))     filled.projects     = [];
    if (!Array.isArray(filled.certifications)) filled.certifications = [];

    return filled;
}

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
    } else if (provider === 'groq') {
        apiKey = process.env.GROQ_API_KEY;
        model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
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
connectDB().catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    console.log('⚠️  Server will run without database features');
});

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

        // Use provided profile or fall back to mock data, filling empty sections
        const profileToUse = fillEmptyProfileSections(userProfile, mockUserProfile);

        console.log('Generating resume for job description:', jobDescription.substring(0, 100) + '...');

        // Create the prompt
        const prompt = createResumePrompt(jobDescription, profileToUse);

        // Call LLM Provider with retry mechanism
        let result;
        let tailoredResume;
        const attempts = 3;
        
        for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
                result = await llmProvider.generateText(prompt, {
                    temperature: 0.7 + (attempt - 1) * 0.1,
                    maxTokens: 6000,
                    responseFormat: 'json',
                    systemPrompt: 'You are an expert resume writer specializing in ATS optimization. Always return valid JSON only, with no additional text or markdown formatting.'
                });

                const resumeText = result.text;
                if (!resumeText || resumeText.trim().length === 0) {
                    throw new Error('Empty response from AI provider');
                }

                tailoredResume = parseJsonFromText(resumeText);
                tailoredResume = cleanTailoredResume(tailoredResume, profileToUse);
                break; // Success!
            } catch (parseError) {
                console.warn(`  ⚠️ Generate resume attempt ${attempt} failed: ${parseError.message}`);
                if (attempt === attempts) {
                    console.error('Failed to parse AI response as JSON after maximum retries:', result ? result.text : 'No result');
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to parse AI response after maximum retries',
                        details: parseError.message
                    });
                }
                // Wait 1 second before retrying
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
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

        const profileToUse = fillEmptyProfileSections(userProfile, mockUserProfile);

        console.log('🔄 Running full tailoring pipeline...');

        // Step 1: Parse job description
        console.log('  1️⃣ Parsing job description...');
        const parsedJD = parseJobDescription(jobDescription);

        // Step 2: Fetch GitHub profile (if provided and not already cached in userProfile)
        let githubProfile = {
            topLanguages: [],
            projects: [],
            stats: { totalRepos: 0, totalStars: 0, totalCommits: 0 }
        };

        const hasCachedGithub = userProfile && userProfile.projects && userProfile.projects.length > 0;
        if (hasCachedGithub) {
            console.log('  2️⃣ Using client-side scraped GitHub repositories...');
            githubProfile = {
                topLanguages: userProfile.skills?.languages || [],
                projects: userProfile.projects,
                stats: { totalRepos: userProfile.projects.length, totalStars: 0, totalCommits: 0 }
            };
        } else if (githubUsername) {
            try {
                console.log(`  2️⃣ Fetching GitHub profile for: ${githubUsername}`);
                githubProfile = await fetchGitHubProfile(githubUsername);
            } catch (error) {
                console.warn(`  ⚠️ GitHub fetch failed: ${error.message}`);
            }
        } else {
            console.log('  2️⃣ No GitHub username provided, skipping...');
        }

        // Fetch LinkedIn profile (if provided and not already cached in userProfile)
        let linkedinData = null;
        const hasCachedLinkedIn = userProfile && userProfile.experience && userProfile.experience.length > 0;
        if (linkedinProfile && !hasCachedLinkedIn) {
            try {
                console.log(`  2.5️⃣ Fetching LinkedIn profile for: ${linkedinProfile}`);
                linkedinData = await fetchLinkedInProfile(linkedinProfile);
            } catch (error) {
                console.warn(`  ⚠️ LinkedIn fetch failed: ${error.message}`);
            }
        } else if (hasCachedLinkedIn) {
            console.log('  2.5️⃣ Using client-side scraped LinkedIn profile...');
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

        // Step 2.6: Profile repositories using RIE (Repository Intelligence Engine)
        let repoIntelligence = { analyzedRepositories: [] };
        if (githubProfile && githubProfile.projects && githubProfile.projects.length > 0) {
            try {
                console.log(`  2.6️⃣ RIE: Profiling ${githubProfile.projects.length} repositories...`);
                const usernameForRIE = githubUsername || userProfile?.personalInfo?.githubUsername || 'SaadHaider01';
                repoIntelligence = await analyzeRepositories({
                    githubUsername: usernameForRIE,
                    repositories: githubProfile.projects
                });
                
                if (repoIntelligence.analyzedRepositories.length > 0) {
                    finalProfileToUse.projects = repoIntelligence.analyzedRepositories;
                }
            } catch (err) {
                console.warn('  ⚠️ RIE profiling failed:', err.message);
            }
        }

        // Step 2.7: Profile LinkedIn experience using PIE (Professional Intelligence Engine)
        let pieProfile = null;
        try {
            console.log('  2.7️⃣ PIE: Profiling LinkedIn profile...');
            const { analyzeProfessionalProfile } = require('./services/professionalIntelligenceService');
            pieProfile = analyzeProfessionalProfile({
                linkedinProfile: {
                    experience: finalProfileToUse.experience || [],
                    education: finalProfileToUse.education || [],
                    certifications: finalProfileToUse.certifications || [],
                    rawSkills: finalProfileToUse.skills?.linkedinSkills || finalProfileToUse.skills?.technical || finalProfileToUse.skills || []
                }
            });
            finalProfileToUse.pieResult = pieProfile;
        } catch (err) {
            console.warn('  ⚠️ PIE profiling failed:', err.message);
        }

        // Step 3: Generate tailoring blueprint
        console.log('  3️⃣ Generating tailoring blueprint...');
        const tailoringBlueprint = generateTailoringBlueprint(parsedJD, finalProfileToUse, repoIntelligence, pieProfile);

        // Step 4: Create enhanced prompt with blueprint
        console.log('  4️⃣ Creating blueprint-enhanced prompt...');
        const prompt = createResumePrompt(jobDescription, finalProfileToUse, tailoringBlueprint);

        // Call LLM Provider through the generateTailoredResume service
        const { generateTailoredResume } = require('./services/resumeGenerator');
        
        const llmCallFn = async (prompt) => {
            const result = await llmProvider.generateText(prompt, {
                temperature: 0.7,
                maxTokens: 6000,
                responseFormat: 'json',
                systemPrompt: 'You are an expert resume writer specializing in ATS optimization. Always return valid JSON only, with no additional text or markdown formatting.'
            });
            return result.text;
        };

        console.log('  5️⃣ Running generateTailoredResume orchestrator...');
        const output = await generateTailoredResume(
            jobDescription,
            finalProfileToUse,
            githubUsername,
            llmCallFn
        );

        let tailoredResume = output.resume;
        
        // Post-process with cleanTailoredResume for strict matching on final profile
        tailoredResume = cleanTailoredResume(tailoredResume, finalProfileToUse);

        // Save tailored_resume_debug.json
        const fs = require('fs');
        const path = require('path');
        try {
            fs.writeFileSync(
                path.join(__dirname, 'tailored_resume_debug.json'),
                JSON.stringify(output, null, 2),
                'utf8'
            );
            console.log('💾 Saved tailoring output to tailored_resume_debug.json');
        } catch (err) {
            console.warn('⚠️ Failed to write tailored_resume_debug.json:', err.message);
        }

        console.log('✅ Resume generation complete!');

        res.json({
            success: true,
            resume: tailoredResume,
            metadata: {
                model: llmProvider.model,
                provider: llmProvider.name,
                generatedAt: new Date().toISOString(),
                diagnostics: output.metadata.diagnostics
            },
            tailoringData: {
                parsedJD: {
                    role: parsedJD.role || '',
                    skillsFound: parsedJD.skills ? parsedJD.skills.length : 0,
                    requirementsFound: parsedJD.keywords ? parsedJD.keywords.length : 0
                },
                blueprint: {
                    matchedSkills: tailoringBlueprint.matchedSkills,
                    missingSkills: tailoringBlueprint.missingSkills,
                    recommendedProjects: tailoringBlueprint.recommendedProjects.map(p => p.name),
                    experienceMatchLevel: tailoringBlueprint.experienceMatchLevel,
                    justificationReport: tailoringBlueprint.justificationReport
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

        // Validation (allow company to be empty string)
        if (!jobDescription || !tailoringBlueprint || !resumeJSON || company === undefined || !jobTitle) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: jobDescription, tailoringBlueprint, resumeJSON, company, jobTitle'
            });
        }

        const companyName = company || 'Hiring Company';
        console.log(`📝 Generating cover letter for ${jobTitle} at ${companyName}...`);

        // Create cover letter prompt
        const prompt = createResumePrompt ? require('./promptTemplate').createCoverLetterPrompt({
            jobDescription,
            tailoringBlueprint,
            resumeJSON,
            company: companyName,
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
