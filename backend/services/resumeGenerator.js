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
const { analyzeProfessionalProfile } = require('./professionalIntelligenceService');


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

    // Step 2.7: Profile professional experience using PIE
    let pieProfile = null;
    try {
        pieProfile = analyzeProfessionalProfile({
            linkedinProfile: {
                experience: enrichedProfile.experience || [],
                education: enrichedProfile.education || [],
                certifications: enrichedProfile.certifications || [],
                rawSkills: enrichedProfile.skills?.linkedinSkills || enrichedProfile.skills?.technical || enrichedProfile.skills || []
            }
        });
        enrichedProfile.pieResult = pieProfile;
    } catch (err) {
        console.warn('Professional intelligence analysis failed:', err.message);
    }

    // Step 3: Generate tailoring blueprint using RIE and PIE profiles
    const tailoringBlueprint = generateTailoringBlueprint(parsedJD, enrichedProfile, repoIntelligence, pieProfile);

    // Step 4: Execute safe LLM with fallback retry sequence (Phase 8)
    const { resume, generationSource } = await safeLLMExecution(
        jobDescription,
        parsedJD,
        enrichedProfile,
        repoIntelligence,
        pieProfile,
        tailoringBlueprint,
        llmCallFn
    );

    // Step 5: Post-generation Deduplication (Phase 6)
    const deduplicatedResume = deduplicateEvidenceUsage(resume);

    // Step 5.5: Hallucination Guard — enforce profile truth against LLM output
    // Certifications: reliably wipe when profile has none (user explicitly manages these).
    const originalCerts = userProfile.certifications || [];
    if (originalCerts.length === 0) {
        deduplicatedResume.certifications = [];
    }
    // NOTE: Experience and education are NOT wiped here.
    // server.js cleanTailoredResume() handles filtering when real company/institution data
    // is available. When the scraper returned [] (failure case), it becomes a no-op —
    // preserving the LLM-generated output which is the correct fallback behaviour.

    // Always overwrite personalInfo with the real profile values (LLM must not change them)
    if (userProfile.personalInfo) {
        const realPi = userProfile.personalInfo;
        const outPi  = deduplicatedResume.personalInfo || {};
        deduplicatedResume.personalInfo = {
            name:     realPi.name     || outPi.name     || '',
            email:    realPi.email    || outPi.email    || '',
            phone:    realPi.phone    || outPi.phone    || '',
            location: realPi.location || outPi.location || '',
            linkedin: realPi.linkedin || outPi.linkedin || '',
            github:   realPi.github   || outPi.github   || ''
        };
    }

    // Step 6: Audit evidence usage (Phase 5/9)
    const evidenceTracker = trackEvidenceUsage(deduplicatedResume, enrichedProfile);
    const availableEvidence = evidenceTracker.length;
    const usedEvidence = evidenceTracker.filter(item => item.usedIn.length > 0).length;
    const eur = availableEvidence > 0 ? Math.round((usedEvidence / availableEvidence) * 100) : 0;

    // Output diagnostics to logs
    const crypto = require('crypto');
    const resumeId = 'res_' + crypto.randomBytes(8).toString('hex');
    const jdHash = crypto.createHash('sha256').update(jobDescription || '').digest('hex');
    const diagnostics = {
        resumeId,
        jdHash,
        generationSource,
        projectCount: (deduplicatedResume.projects || []).length,
        experienceCount: (deduplicatedResume.experience || []).length,
        educationCount: (deduplicatedResume.education || []).length,
        certificationCount: (deduplicatedResume.certifications || []).length
    };
    console.log('📊 GENERATION DIAGNOSTICS:', JSON.stringify(diagnostics, null, 2));


    return {
        resume: deduplicatedResume,
        metadata: {
            parsedJD,
            githubProfile: repoIntelligence,
            pieProfile,
            tailoringBlueprint,
            evidenceTracker,
            eurMetrics: {
                availableEvidence,
                usedEvidence,
                eur
            },
            diagnostics
        }
    };
}

/**
 * Creates a blueprint-enhanced prompt for the LLM
 * 
 * @param {Object} data - Combined pipeline data
 * @param {number} attemptNum - Attempt level (1 = Full, 2 = Reduced, 3 = Minimal)
 * @returns {string} Enhanced prompt
 */
function createBlueprintEnhancedPrompt(data, attemptNum = 1) {
    const { jobDescription, parsedJD, userProfile, evidenceCards, tailoringBlueprint } = data;
    const { 
        matchedSkills, 
        missingSkills, 
        recommendedProjects, 
        experienceMatchLevel, 
        keywordInjectionList,
        careerDNA,
        justificationReport
    } = tailoringBlueprint;

    // Determine tone based on experience match
    const toneGuidance = getToneGuidance(experienceMatchLevel);

    let dnaSection = '';
    if (careerDNA && careerDNA.dominantDomains) {
        dnaSection = `
🧬 CAREER DNA:
Dominant Domains: ${careerDNA.dominantDomains.join(', ') || 'None identified'}
Secondary Domains: ${careerDNA.secondaryDomains.join(', ') || 'None identified'}
DNA Confidence: ${careerDNA.confidence}
`;
    }

    let justificationSection = '';
    if (justificationReport) {
        justificationSection = `
⚖️ RESUME JUSTIFICATION:
- Included: ${justificationReport.included.map(i => `${i.type}: ${i.name} (Score: ${i.relevanceScore})`).join(', ') || 'None'}
- Excluded: ${justificationReport.excluded.map(e => `${e.type}: ${e.name} (Score: ${e.relevanceScore})`).join(', ') || 'None'}
`;
    }

    // Build personal info lock section
    const pi = userProfile?.personalInfo || {};
    const personalInfoLock = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 CANDIDATE IDENTITY (LOCKED — DO NOT CHANGE THESE FIELDS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The resume you generate is for this specific candidate. Use EXACTLY these values in personalInfo:
  Name:     ${pi.name || 'Unknown'}
  Email:    ${pi.email || ''}
  Phone:    ${pi.phone || ''}
  Location: ${pi.location || ''}
  LinkedIn: ${pi.linkedin || ''}
  GitHub:   ${pi.github || ''}

RULE: Do NOT change, invent, or substitute any of the above fields. Copy them verbatim into the "personalInfo" section of the output JSON.
`;

    // Build empty-section directives so the LLM doesn't fabricate work history
    // Note: sanitizedUser uses 'experiences' (plural); raw profile uses 'experience'
    const hasExperience = (Array.isArray(userProfile?.experiences) && userProfile.experiences.length > 0) ||
                          (Array.isArray(userProfile?.experience) && userProfile.experience.length > 0);
    const hasEducation = Array.isArray(userProfile?.education) && userProfile.education.length > 0;
    const hasCertifications = Array.isArray(userProfile?.certifications) && userProfile.certifications.length > 0;


    // Only block certifications in the directive — we cannot reliably distinguish
    // "candidate has no experience" from "LinkedIn scraper failed silently".
    // For certifications the user explicitly manages them, so empty reliably means none.
    let emptySectionDirective = '';
    if (!hasCertifications) {
        emptySectionDirective = `
⛔ CERTIFICATIONS DIRECTIVE:
The candidate does NOT have any certifications listed in their profile.
DO NOT invent or fabricate certification entries. Return exactly [] for certifications.
`;
    }

    // Format evidence cards into text payload
    let evidenceCardsSection = '';
    if (evidenceCards && Array.isArray(evidenceCards)) {
        evidenceCardsSection = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 VERIFIED EVIDENCE CARDS (DO NOT GENERATE ANY CLAIMS OUTSIDE THESE CARDS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${JSON.stringify(evidenceCards, null, 2)}
`;
    }

    return `You are an expert resume writer and ATS (Applicant Tracking System) optimization specialist.

Your task is to create a tailored, ATS-optimized resume based on the job description, verified metrics, and evidence cards provided below.
${personalInfoLock}${emptySectionDirective}
CRITICAL REQUIREMENTS:
1. Tailor the resume specifically to match the job requirements.
2. Use keywords from the job description naturally throughout the resume.
3. Optimize for ATS parsing (clear structure, standard section headers, no complex formatting).
4. Highlight the most relevant experience and skills first.
5. Quantify achievements ONLY when a metric exists in the source evidence. NEVER invent any numerical claims.
6. Each bullet point you generate in achievements and highlights MUST be a detailed, action-oriented, complete sentence of 10 to 25 words. NEVER generate short, generic, or single-phrase bullet points (such as 'Scalable Solutions', 'Cloud Integration', 'Automation').
7. You MUST utilize and cover at least 80% of the provided evidence cards' achievements and facts.
8. Keep professional summary concise (2-3 sentences).
9. Use action verbs to start each bullet point.
10. STRICTOR RULES AGAINST HALLUCINATION:
    - Use ONLY the actual experience listed in the evidence cards/USER PROFILE. If it contains no experience, use that. Do NOT invent or add fake jobs, companies, or dates. If empty, return "experience": [].
    - Use ONLY the actual education listed in the evidence cards/USER PROFILE. Do NOT invent or add fake degrees or universities. If empty, return "education": [].
    - Use ONLY the actual projects listed in the evidence cards/USER PROFILE. Do NOT invent other projects. If empty, return "projects": [].
11. Return ONLY valid JSON, no additional text or explanation.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️ EVIDENCE FENCE (CRITICAL DIRECTIVE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You may ONLY describe verified facts, verified technologies, verified capabilities, and verified achievements from the evidence cards.
You may NOT invent, extrapolate, or assume:
- percentages
- user counts
- revenue impact
- team size
- mentoring
- leadership
- architecture ownership
- business outcomes
- performance improvements
- programming languages, frameworks, libraries, databases, cloud services, and tools (you may ONLY list technologies that are explicitly present in the corresponding project or experience card. For example, do NOT list 'Python', 'Pandas', or 'Matplotlib' under a project unless those technologies are explicitly present in that project's evidence card).
- companies, jobs, roles, or durations of employment (you may ONLY list jobs/companies that are explicitly present in the experience cards. Do NOT invent or add fake jobs/companies like 'TechCorp' or 'Startup A' just because they are mentioned in the job description).
- projects (you may ONLY list projects that are explicitly present in the project cards. Do NOT invent other projects).
- degrees, majors, or institutions (you may ONLY list education entries that are explicitly present in the education/summary card. Do NOT invent degrees or universities).
unless they are explicitly present in the verifiedMetrics or verifiedFacts of the corresponding Evidence Card.

If evidence for a metric or business outcome does not exist, describe the capability, scope, technology, and implementation instead.
Each bullet point MUST be a complete, informative sentence. Do not truncate descriptions or use short generic summaries.
Example:
- GOOD (No metric available): "Implemented scalable REST API endpoints supporting document processing workflows using Node.js."
- BAD (Invented metric): "Improved system performance by 40%." (Do NOT write this unless "40%" is in the verifiedMetrics of that experience/project).
- BAD (Too short/generic): "Scalable Solutions" or "Cloud Integration". (Always write a full sentence).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 BULLET DIVERSITY & USED EVIDENCE TRACKER RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Keep a mental "usedEvidenceTracker". A specific source achievement or piece of repository evidence may only be used ONCE across the entire tailored resume. If you describe a capability or project in the Projects section, do not repeat it or the same achievements/metrics in the Experience section, and vice versa.
Different resume sections should emphasize different dimensions:
- Experience (Senior): scale, ownership, architecture.
- Experience (Intern): implementation, learning, execution.
- Projects: features, technologies, problem-solving.
- Certifications: knowledge areas.
- Education: academic foundation.

JOB DESCRIPTION:
${jobDescription}

${evidenceCardsSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 TAILORING INTELLIGENCE (Use This to Guide Resume Generation)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${dnaSection}${justificationSection}
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
1. **Skills Section**: Prioritize MATCHED SKILLS at the top of the technical skills list.
2. **Projects Section**: Include RECOMMENDED PROJECTS first.
3. **Keyword Integration**: Naturally weave in keywords from KEYWORD INJECTION LIST throughout achievements and descriptions.
4. **Experience Bullet Points**: Rewrite to highlight experiences that match the job requirements, obeying the EVIDENCE FENCE.
5. **Professional Summary**: Incorporate matched skills, align with experience match level, and obey allowed contexts for summary metrics.
6. **Tone**: ${toneGuidance}

Generate the tailored resume now:`;
}

/**
 * Formats recommended projects for prompt
 * @param {Array} projects - Recommended projects
 * @returns {string} Formatted string
 */
function formatRecommendedProjects(projects) {
    if (!projects || projects.length === 0) {
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

/**
 * Extracts verified metrics with full provenance (Phase 1)
 * @param {Object} userProfile - Enriched user profile
 * @returns {Array} List of metrics
 */
function extractVerifiedMetrics(userProfile) {
    if (!userProfile) return [];
    const metrics = [];

    const extractFromText = (text, source, sourceType, allowedContexts) => {
        if (!text || typeof text !== 'string') return;
        
        const regexes = [
            /\b\d+(?:\.\d+)?%\b/gi,                           // e.g. 40%
            /\b\d+(?:\.\d+)?\s*percent\b/gi,                  // e.g. 40 percent
            /\b\d+(?:\.\d+)?\s*[km]\+?\b/gi,                  // e.g. 1M+, 10k
            /\b\d+(?:\.\d+)?\s*million\b/gi,                  // e.g. 1 million
            /\b\d+\+?\s*(?:year|yr)s?(?:\s+experience)?\b/gi, // e.g. 7 years experience
            /\$\d+(?:\.\d+)?\s*[km]?\b/gi,                    // e.g. $100, $5M
            /\b\d+\s*(?:user|customer|client|developer|server|node|repo|database|star|commit)s?\b/gi // counts
        ];

        regexes.forEach(regex => {
            const matches = text.match(regex);
            if (matches) {
                matches.forEach(m => {
                    const cleaned = m.trim().replace(/\s+/g, ' ');
                    if (!metrics.some(x => x.value.toLowerCase() === cleaned.toLowerCase() && x.source === source)) {
                        metrics.push({
                            value: cleaned,
                            source,
                            sourceType,
                            allowedContexts
                        });
                    }
                });
            }
        });
    };

    // 1. totalExperience
    if (userProfile.totalExperience) {
        extractFromText(userProfile.totalExperience, "Candidate Summary", "summary", ["professional_summary"]);
    }

    // 2. Experience achievements
    if (Array.isArray(userProfile.experience)) {
        userProfile.experience.forEach(exp => {
            const company = exp.company || '';
            const source = `${company} Experience`;
            const allowedContexts = [company, exp.position, source].filter(Boolean);
            if (exp.description) {
                extractFromText(exp.description, source, "experience", allowedContexts);
            }
            if (Array.isArray(exp.achievements)) {
                exp.achievements.forEach(ach => {
                    extractFromText(ach, source, "experience", allowedContexts);
                });
            }
        });
    }

    // 3. Projects/repos
    if (Array.isArray(userProfile.projects)) {
        userProfile.projects.forEach(proj => {
            const projName = proj.repositoryName || proj.name || '';
            const source = `${projName} Project`;
            const allowedContexts = [projName, source].filter(Boolean);
            
            if (proj.description) {
                extractFromText(proj.description, source, "project", allowedContexts);
            }
            if (proj.recruiterSummary) {
                extractFromText(proj.recruiterSummary, source, "project", allowedContexts);
            }
            if (proj.mockFiles && typeof proj.mockFiles === 'object') {
                Object.values(proj.mockFiles).forEach(val => {
                    if (typeof val === 'string') extractFromText(val, source, "project", allowedContexts);
                });
            }
            if (proj.fileContents && typeof proj.fileContents === 'object') {
                Object.values(proj.fileContents).forEach(val => {
                    if (typeof val === 'string') extractFromText(val, source, "project", allowedContexts);
                });
            }
            // proj.evidence metrics are skipped to avoid leakage of confidence scores
            if (proj.stars > 0) {
                const starMetric = `${proj.stars} stars`;
                if (!metrics.some(x => x.value === starMetric && x.source === source)) {
                    metrics.push({
                        value: starMetric,
                        source,
                        sourceType: "project",
                        allowedContexts
                    });
                }
            }
        });
    }

    return metrics;
}

function sanitizeProfileForPrompt(userProfile, repoIntelligence, pieProfile) {
    const allMetrics = extractVerifiedMetrics(userProfile);

    // Build experiences from the raw profile first; fall back to PIE-analyzed experiences
    // when the scraper returned empty arrays (e.g. LinkedIn DOM changed).
    let rawExperiences = userProfile.experience || [];
    if (rawExperiences.length === 0 && pieProfile && Array.isArray(pieProfile.experiences) && pieProfile.experiences.length > 0) {
        // Normalize PIE experience shape to match the raw profile shape
        rawExperiences = pieProfile.experiences.map(pie => ({
            company: pie.company || '',
            position: pie.title || '',
            duration: pie.durationMonths ? `${pie.durationMonths} months` : '',
            location: '',
            achievements: pie.responsibilities || []
        }));
        console.log(`[sanitizeProfileForPrompt] Using PIE fallback: ${rawExperiences.length} experiences`);
    }

    const cleanExperiences = rawExperiences.map(exp => {
        const companyName = exp.company || '';
        const expMetrics = allMetrics
            .filter(m => m.sourceType === 'experience' && m.allowedContexts.some(c => c.toLowerCase() === companyName.toLowerCase()))
            .map(m => m.value);

        return {
            title: exp.position || '',
            company: companyName,
            duration: exp.duration || '',
            location: exp.location || '',
            achievements: exp.achievements || [],
            verifiedMetrics: expMetrics
        };
    });

    const cleanProjects = [];
    const projectsList = userProfile.projects || (repoIntelligence && repoIntelligence.analyzedRepositories) || [];
    projectsList.forEach(proj => {
        const projName = proj.repositoryName || proj.name || '';
        const projMetrics = allMetrics
            .filter(m => m.sourceType === 'project' && m.allowedContexts.some(c => c.toLowerCase() === projName.toLowerCase()))
            .map(m => m.value);

        let capabilities = [];
        if (Array.isArray(proj.detectedCapabilities)) {
            capabilities = proj.detectedCapabilities.map(c => c.capability);
        } else if (Array.isArray(proj.capabilities)) {
            capabilities = proj.capabilities;
        }

        const verifiedAchievements = [];
        if (proj.description) verifiedAchievements.push(proj.description);
        // Do NOT populate from proj.evidence (internal RIE tracking strings cause data leaks and lower BQS)

        cleanProjects.push({
            name: projName,
            description: proj.description || '',
            technologies: proj.technologies || [],
            capabilities: capabilities,
            recruiterSummary: proj.recruiterSummary || '',
            verifiedAchievements: verifiedAchievements,
            verifiedMetrics: projMetrics
        });
    });

    return {
        name: userProfile.personalInfo?.name || '',
        personalInfo: userProfile.personalInfo ? {
            name: userProfile.personalInfo.name || '',
            email: userProfile.personalInfo.email || '',
            phone: userProfile.personalInfo.phone || '',
            location: userProfile.personalInfo.location || '',
            github: userProfile.personalInfo.github || '',
            linkedin: userProfile.personalInfo.linkedin || ''
        } : null,
        skills: userProfile.skills ? {
            technical: userProfile.skills.technical || userProfile.skills || [],
            tools: userProfile.skills.tools || [],
            soft: userProfile.skills.soft || []
        } : null,
        experiences: cleanExperiences,
        projects: cleanProjects,
        education: (() => {
            // Use raw education if available, otherwise fall back to PIE-analyzed education
            const rawEdu = userProfile.education || [];
            if (rawEdu.length > 0) {
                return rawEdu.map(edu => ({
                    degree: edu.degree || '',
                    institution: edu.institution || '',
                    graduation: edu.graduation || ''
                }));
            }
            // PIE fallback
            if (pieProfile && Array.isArray(pieProfile.education) && pieProfile.education.length > 0) {
                return pieProfile.education.map(edu => ({
                    degree: edu.degree || '',
                    institution: edu.institution || '',
                    graduation: edu.graduationYear || edu.graduation || ''
                }));
            }
            return [];
        })(),
        certifications: userProfile.certifications || [],
        verifiedMetrics: allMetrics
    };
}

/**
 * Converts sanitized profile to Evidence Cards (Phase 4)
 * @param {Object} sanitizedProfile - clean profile
 * @returns {Array} List of evidence cards
 */
function generateEvidenceCards(sanitizedProfile) {
    const cards = [];

    // 1. Candidate Summary Card
    const generalFacts = [];
    if (sanitizedProfile.skills) {
        if (Array.isArray(sanitizedProfile.skills.technical)) {
            generalFacts.push(`Technical Skills: ${sanitizedProfile.skills.technical.join(', ')}`);
        }
        if (Array.isArray(sanitizedProfile.skills.tools)) {
            generalFacts.push(`Tools: ${sanitizedProfile.skills.tools.join(', ')}`);
        }
    }
    if (Array.isArray(sanitizedProfile.education)) {
        sanitizedProfile.education.forEach(edu => {
            generalFacts.push(`Education: ${edu.degree} from ${edu.institution} (Graduation: ${edu.graduation})`);
        });
    }
    if (Array.isArray(sanitizedProfile.certifications)) {
        generalFacts.push(`Certifications: ${sanitizedProfile.certifications.join(', ')}`);
    }

    const summaryMetrics = sanitizedProfile.verifiedMetrics
        ? sanitizedProfile.verifiedMetrics.filter(m => m.sourceType === 'summary').map(m => m.value)
        : [];

    cards.push({
        section: "Candidate Summary & Skills",
        verifiedFacts: generalFacts,
        verifiedMetrics: summaryMetrics,
        forbiddenClaims: ["invented certifications", "invented degrees", "invented languages"]
    });

    // 2. Experience Cards
    if (Array.isArray(sanitizedProfile.experiences)) {
        sanitizedProfile.experiences.forEach(exp => {
            cards.push({
                experience: `${exp.company} (${exp.title})`,
                verifiedFacts: exp.achievements || [],
                verifiedMetrics: exp.verifiedMetrics || [],
                forbiddenClaims: [
                    "team size",
                    "mentoring",
                    "leadership",
                    "architecture ownership",
                    "performance improvements",
                    "business outcomes",
                    "percentages"
                ]
            });
        });
    }

    // 3. Project Cards
    if (Array.isArray(sanitizedProfile.projects)) {
        sanitizedProfile.projects.forEach(proj => {
            const facts = [
                proj.description,
                proj.recruiterSummary,
                ...proj.verifiedAchievements
            ].filter(Boolean);

            if (proj.technologies && proj.technologies.length > 0) {
                facts.push(`Technologies: ${proj.technologies.join(', ')}`);
            }
            if (proj.capabilities && proj.capabilities.length > 0) {
                facts.push(`Capabilities: ${proj.capabilities.join(', ')}`);
            }

            cards.push({
                project: proj.name,
                verifiedFacts: Array.from(new Set(facts)),
                verifiedMetrics: proj.verifiedMetrics || [],
                forbiddenClaims: [
                    "user counts",
                    "performance improvements",
                    "revenue impact",
                    "team size",
                    "mentoring",
                    "leadership",
                    "percentages"
                ]
            });
        });
    }

    return cards;
}

/**
 * Tracks usage of available evidence in generated resume (Phase 5/9)
 * @param {Object} resume - tailored resume
 * @param {Object} originalProfile - enriched profile
 * @returns {Array} detailed usedEvidenceTracker
 */
function trackEvidenceUsage(resume, originalProfile) {
    const available = [];
    
    if (originalProfile.experience && Array.isArray(originalProfile.experience)) {
        originalProfile.experience.forEach((exp, expIdx) => {
            const company = exp.company || `Company_${expIdx}`;
            if (Array.isArray(exp.achievements)) {
                exp.achievements.forEach((ach, achIdx) => {
                    available.push({
                        evidenceId: `${company.toLowerCase().replace(/[^a-z0-9]/g, '_')}_ach_${achIdx}`,
                        text: ach,
                        source: `${company} Experience`
                    });
                });
            }
        });
    }

    if (originalProfile.projects && Array.isArray(originalProfile.projects)) {
        originalProfile.projects.forEach((proj, projIdx) => {
            const projName = proj.repositoryName || proj.name || `Project_${projIdx}`;
            if (proj.description) {
                available.push({
                    evidenceId: `${projName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_desc`,
                    text: proj.description,
                    source: `${projName} Project`
                });
            }
            if (proj.mockFiles && proj.mockFiles['README.md']) {
                available.push({
                    evidenceId: `${projName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_readme`,
                    text: proj.mockFiles['README.md'],
                    source: `${projName} Project`
                });
            }
        });
    }

    const tracker = available.map(item => ({
        evidenceId: item.evidenceId,
        source: item.source,
        text: item.text,
        usedIn: []
    }));

    const getWordSet = (text) => {
        return new Set(text.toLowerCase().split(/\W+/).filter(w => w.length > 4));
    };

    const calculateOverlap = (text1, text2) => {
        const set1 = getWordSet(text1);
        const set2 = getWordSet(text2);
        if (set1.size === 0 || set2.size === 0) return 0;
        let intersect = 0;
        set1.forEach(w => {
            if (set2.has(w)) intersect++;
        });
        const unionSize = set1.size + set2.size - intersect;
        return intersect / unionSize;
    };

    // experiences
    if (resume && resume.experience && Array.isArray(resume.experience)) {
        resume.experience.forEach((exp, expIdx) => {
            const bullets = exp.achievements || exp.bullets || exp.highlights || [];
            bullets.forEach((bullet, bulletIdx) => {
                tracker.forEach(trackItem => {
                    const similarity = calculateOverlap(bullet, trackItem.text);
                    if (similarity > 0.30) {
                        trackItem.usedIn.push(`experience_${expIdx}_bullet_${bulletIdx}`);
                    }
                });
            });
        });
    }

    // projects
    if (resume && resume.projects && Array.isArray(resume.projects)) {
        resume.projects.forEach((proj, projIdx) => {
            const bullets = proj.highlights || proj.bullets || proj.achievements || [];
            bullets.forEach((bullet, bulletIdx) => {
                tracker.forEach(trackItem => {
                    const similarity = calculateOverlap(bullet, trackItem.text);
                    if (similarity > 0.30) {
                        trackItem.usedIn.push(`project_${projIdx}_bullet_${bulletIdx}`);
                    }
                });
            });
        });
    }

    return tracker;
}

/**
 * Deduplicates near-duplicate generated resume bullets (Phase 6)
 * @param {Object} resume - tailored resume
 * @returns {Object} cleaned resume
 */
function deduplicateEvidenceUsage(resume) {
    if (!resume) return resume;

    const usedBullets = new Set();
    const cleanWordSet = (text) => {
        return new Set(text.toLowerCase().split(/\W+/).filter(w => w.length > 4));
    };

    const isNearDuplicate = (bullet, trackedSet) => {
        const words = cleanWordSet(bullet);
        if (words.size === 0) return false;
        
        for (const tracked of trackedSet) {
            const trackedWords = cleanWordSet(tracked);
            if (trackedWords.size === 0) continue;
            
            let intersect = 0;
            words.forEach(w => {
                if (trackedWords.has(w)) intersect++;
            });
            
            const unionSize = words.size + trackedWords.size - intersect;
            const similarity = intersect / unionSize;
            if (similarity > 0.45) { // 45% similarity overlap
                return true;
            }
        }
        return false;
    };

    // experiences
    if (resume.experience && Array.isArray(resume.experience)) {
        resume.experience.forEach(exp => {
            const achievements = exp.achievements || exp.bullets || exp.highlights || [];
            const cleanAchievements = [];
            achievements.forEach(bullet => {
                if (typeof bullet !== 'string') return;
                if (isNearDuplicate(bullet, usedBullets)) {
                    console.log(`[Deduplicator] Removing near-duplicate bullet: "${bullet}"`);
                } else {
                    cleanAchievements.push(bullet);
                    usedBullets.add(bullet);
                }
            });
            if (exp.achievements) exp.achievements = cleanAchievements;
            else if (exp.bullets) exp.bullets = cleanAchievements;
            else if (exp.highlights) exp.highlights = cleanAchievements;
        });
    }

    // projects
    if (resume.projects && Array.isArray(resume.projects)) {
        resume.projects.forEach(proj => {
            const highlights = proj.highlights || proj.bullets || proj.achievements || [];
            const cleanHighlights = [];
            highlights.forEach(bullet => {
                if (typeof bullet !== 'string') return;
                if (isNearDuplicate(bullet, usedBullets)) {
                    console.log(`[Deduplicator] Removing near-duplicate project bullet: "${bullet}"`);
                } else {
                    cleanHighlights.push(bullet);
                    usedBullets.add(bullet);
                }
            });
            if (proj.highlights) proj.highlights = cleanHighlights;
            else if (proj.bullets) proj.bullets = cleanHighlights;
            else if (proj.achievements) proj.achievements = cleanHighlights;
        });
    }

    return resume;
}

/**
 * Robust JSON parsing, cleaning, and schema validation (Phase 8)
 * @param {string|Object} response - raw response
 * @returns {Object|null} parsed JSON or null
 */
function cleanAndValidateJSON(response) {
    if (!response) return null;
    
    if (typeof response === 'object') {
        if (validateResumeSchema(response)) {
            return response;
        }
        response = JSON.stringify(response);
    }

    if (typeof response !== 'string') return null;

    let clean = response.trim();

    // strip code fences
    clean = clean.replace(/^```json\s*/i, '');
    clean = clean.replace(/^```text\s*/i, '');
    clean = clean.replace(/^```\s*/, '');
    clean = clean.replace(/\s*```$/, '');
    clean = clean.trim();

    // safety wrappers extraction
    if (!clean.startsWith('{')) {
        const startIdx = clean.indexOf('{');
        if (startIdx !== -1) {
            clean = clean.substring(startIdx);
        }
    }
    if (!clean.endsWith('}')) {
        const endIdx = clean.lastIndexOf('}');
        if (endIdx !== -1) {
            clean = clean.substring(0, endIdx + 1);
        }
    }

    try {
        const obj = JSON.parse(clean);
        if (validateResumeSchema(obj)) {
            return obj;
        }
    } catch (e) {
        console.error('[cleanAndValidateJSON] JSON parse failed:', e.message);
    }
    return null;
}

/**
 * Validates generated resume schema completeness (Phase 8)
 * @param {Object} obj - parsed object
 * @returns {boolean} valid or not
 */
function validateResumeSchema(obj) {
    if (!obj || typeof obj !== 'object') return false;
    const required = ['personalInfo', 'professionalSummary', 'skills', 'experience'];
    for (const key of required) {
        if (!(key in obj)) return false;
    }
    if (!Array.isArray(obj.experience)) return false;
    if (obj.skills && typeof obj.skills !== 'object') return false;
    return true;
}

/**
 * 3-stage fallback retry loop (Phase 8)
 * @param {string} jobDescription - JD
 * @param {Object} parsedJD - parsed JD
 * @param {Object} enrichedProfile - profile
 * @param {Object} repoIntelligence - repo data
 * @param {Object} pieProfile - pie result
 * @param {Object} tailoringBlueprint - blueprint
 * @param {Function} llmCallFn - LLM function
 * @returns {Promise<Object>} resume object
 */
async function safeLLMExecution(jobDescription, parsedJD, enrichedProfile, repoIntelligence, pieProfile, tailoringBlueprint, llmCallFn) {
    const sanitizedUser = sanitizeProfileForPrompt(enrichedProfile, repoIntelligence, pieProfile);
    const evidenceCards = generateEvidenceCards(sanitizedUser);

    let lastError = null;

    // Attempt 1: Full Prompt
    try {
        console.log('🚀 [safeLLMExecution] Attempt 1: Full Prompt');
        const prompt = createBlueprintEnhancedPrompt({
            jobDescription,
            parsedJD,
            userProfile: sanitizedUser,
            evidenceCards,
            tailoringBlueprint
        }, 1);

        const rawResponse = await llmCallFn(prompt);
        const parsed = cleanAndValidateJSON(rawResponse);
        if (parsed) return { resume: parsed, generationSource: 'LLM_GENERATED' };
        throw new Error('Attempt 1 response failed JSON parsing or schema validation');
    } catch (err) {
        console.warn('⚠️ [safeLLMExecution] Attempt 1 failed:', err.message);
        lastError = err;
    }

    // Attempt 2: Reduced Prompt (clean/limit facts to avoid overloading or safety blocks)
    try {
        console.log('🚀 [safeLLMExecution] Attempt 2: Reduced Prompt');
        const reducedCards = evidenceCards.map(card => {
            if (card.verifiedFacts) {
                return {
                    ...card,
                    verifiedFacts: card.verifiedFacts.slice(0, 3)
                };
            }
            return card;
        });

        const prompt = createBlueprintEnhancedPrompt({
            jobDescription,
            parsedJD,
            userProfile: sanitizedUser,
            evidenceCards: reducedCards,
            tailoringBlueprint
        }, 2);

        const rawResponse = await llmCallFn(prompt);
        const parsed = cleanAndValidateJSON(rawResponse);
        if (parsed) return { resume: parsed, generationSource: 'LLM_GENERATED' };
        throw new Error('Attempt 2 response failed JSON parsing or schema validation');
    } catch (err) {
        console.warn('⚠️ [safeLLMExecution] Attempt 2 failed:', err.message);
        lastError = err;
    }

    // Attempt 3: Minimal Prompt (keep only the single most crucial fact)
    try {
        console.log('🚀 [safeLLMExecution] Attempt 3: Minimal Prompt');
        const minimalCards = evidenceCards.map(card => {
            if (card.verifiedFacts) {
                return {
                    ...card,
                    verifiedFacts: card.verifiedFacts.slice(0, 1)
                };
            }
            return card;
        });

        const prompt = createBlueprintEnhancedPrompt({
            jobDescription,
            parsedJD,
            userProfile: sanitizedUser,
            evidenceCards: minimalCards,
            tailoringBlueprint
        }, 3);

        const rawResponse = await llmCallFn(prompt);
        const parsed = cleanAndValidateJSON(rawResponse);
        if (parsed) return { resume: parsed, generationSource: 'LLM_GENERATED' };
        throw new Error('Attempt 3 response failed JSON parsing or schema validation');
    } catch (err) {
        console.warn('⚠️ [safeLLMExecution] Attempt 3 failed:', err.message);
        lastError = err;
    }

    // Fallback Recovery
    console.log('⚠️ [safeLLMExecution] All attempts failed or safety blocked. Generating fallback resume...');
    return { resume: generateFallbackResume(sanitizedUser, parsedJD), generationSource: 'FALLBACK_RECOVERY' };
}

/**
 * Generates a fallback resume using the sanitized user profile to guarantee 100% completion rate.
 * @param {Object} sanitizedUser - sanitized user profile
 * @param {Object} parsedJD - parsed job description
 * @returns {Object} Fallback resume matching the schema
 */
function generateFallbackResume(sanitizedUser, parsedJD) {
    return {
        personalInfo: {
            name: sanitizedUser.name || sanitizedUser.personalInfo?.name || "Saad Haider",
            email: sanitizedUser.personalInfo?.email || "",
            phone: sanitizedUser.personalInfo?.phone || "",
            location: sanitizedUser.personalInfo?.location || "",
            linkedin: sanitizedUser.personalInfo?.linkedin || "",
            github: sanitizedUser.personalInfo?.github || ""
        },
        professionalSummary: `Experienced software developer with a strong background in frontend and backend technologies. Proven ability to design, develop, and maintain clean and scalable codebases.`,
        skills: {
            technical: sanitizedUser.skills?.technical || [],
            tools: sanitizedUser.skills?.tools || [],
            soft: sanitizedUser.skills?.soft || []
        },
        experience: (sanitizedUser.experiences || []).map(exp => ({
            company: exp.company || "",
            position: exp.title || "",
            duration: exp.duration || "",
            location: exp.location || "",
            achievements: exp.achievements || []
        })),
        education: (sanitizedUser.education || []).map(edu => ({
            degree: edu.degree || "",
            institution: edu.institution || "",
            graduation: edu.graduation || ""
        })),
        projects: (sanitizedUser.projects || []).map(proj => ({
            name: proj.name || "",
            description: proj.description || "",
            technologies: proj.technologies || [],
            highlights: proj.verifiedAchievements || []
        })),
        certifications: sanitizedUser.certifications || []
    };
}

module.exports = {
    generateTailoredResume,
    createBlueprintEnhancedPrompt,
    generateEvidenceCards,
    trackEvidenceUsage,
    deduplicateEvidenceUsage,
    cleanAndValidateJSON,
    safeLLMExecution
};

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
    if (!originalProfile.experience || originalProfile.experience.length === 0) {
        tailoredResume.experience = [];
    } else {
        const originalCompanies = originalProfile.experience.map(exp => exp.company).filter(Boolean);
        tailoredResume.experience = (tailoredResume.experience || []).filter(exp =>
            matchesAny(exp.company, originalCompanies)
        );
    }

    // 2. Clean Education
    if (!originalProfile.education || originalProfile.education.length === 0) {
        tailoredResume.education = [];
    } else {
        const originalInstitutions = originalProfile.education.map(edu => edu.institution).filter(Boolean);
        tailoredResume.education = (tailoredResume.education || []).filter(edu =>
            matchesAny(edu.institution, originalInstitutions)
        );
    }

    // 3. Clean Projects
    if (!originalProfile.projects || originalProfile.projects.length === 0) {
        tailoredResume.projects = [];
    } else {
        const originalProjects = originalProfile.projects.map(proj => proj.name || proj.repositoryName).filter(Boolean);
        tailoredResume.projects = (tailoredResume.projects || []).filter(proj =>
            matchesAny(proj.name, originalProjects)
        );

        // Clean technologies for each remaining project to prevent technology hallucination
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

                // Sanitize project description and highlights strings to remove disallowed/hallucinated technologies
                const sanitizeString = (str) => {
                    if (!str || typeof str !== 'string') return str;
                    let clean = str;

                    // If python is not allowed, strip python-specific terms
                    if (!allowedTech.has('python')) {
                        const pythonReplacements = [
                            { pattern: /\bpython\s+backend\b/gi, replacement: 'backend' },
                            { pattern: /\bpython\s+scripts?\b/gi, replacement: 'scripts' },
                            { pattern: /\bpython\s+modules?\b/gi, replacement: 'modules' },
                            { pattern: /\bpython\s+code\b/gi, replacement: 'code' },
                            { pattern: /\bpython\s+libraries\b/gi, replacement: 'libraries' },
                            { pattern: /\bpython\s+frameworks?\b/gi, replacement: 'frameworks' },
                            { pattern: /\bpython\s+applications?\b/gi, replacement: 'applications' },
                            { pattern: /\bpython-based\b/gi, replacement: '' },
                            { pattern: /\bin\s+python\b/gi, replacement: '' },
                            { pattern: /\busing\s+python\b/gi, replacement: '' },
                            { pattern: /\bwith\s+python\b/gi, replacement: '' },
                            { pattern: /\bpython\b/gi, replacement: '' }
                        ];
                        pythonReplacements.forEach(r => {
                            clean = clean.replace(r.pattern, r.replacement);
                        });
                    }

                    // If fastapi is not allowed
                    if (!allowedTech.has('fastapi')) {
                        clean = clean.replace(/\bfastapi\s+backend\b/gi, 'backend')
                                     .replace(/\bfastapi\s+APIs?\b/gi, 'APIs')
                                     .replace(/\bfastapi\s+frameworks?\b/gi, 'frameworks')
                                     .replace(/\bfastapi\s+applications?\b/gi, 'applications')
                                     .replace(/\bin\s+fastapi\b/gi, '')
                                     .replace(/\busing\s+fastapi\b/gi, '')
                                     .replace(/\bwith\s+fastapi\b/gi, '')
                                     .replace(/\bfastapi\b/gi, '');
                    }

                    // If django is not allowed
                    if (!allowedTech.has('django')) {
                        clean = clean.replace(/\bdjango\s+backend\b/gi, 'backend')
                                     .replace(/\bdjango\s+frameworks?\b/gi, 'frameworks')
                                     .replace(/\bdjango\s+applications?\b/gi, 'applications')
                                     .replace(/\bin\s+django\b/gi, '')
                                     .replace(/\busing\s+django\b/gi, '')
                                     .replace(/\bwith\s+django\b/gi, '')
                                     .replace(/\bdjango\b/gi, '');
                    }

                    // If flask is not allowed
                    if (!allowedTech.has('flask')) {
                        clean = clean.replace(/\bflask\s+backend\b/gi, 'backend')
                                     .replace(/\bflask\s+frameworks?\b/gi, 'frameworks')
                                     .replace(/\bflask\s+applications?\b/gi, 'applications')
                                     .replace(/\bin\s+flask\b/gi, '')
                                     .replace(/\busing\s+flask\b/gi, '')
                                     .replace(/\bwith\s+flask\b/gi, '')
                                     .replace(/\bflask\b/gi, '');
                    }

                    // If pandas is not allowed
                    if (!allowedTech.has('pandas')) {
                        clean = clean.replace(/\bpandas\b/gi, '');
                    }

                    // If numpy is not allowed
                    if (!allowedTech.has('numpy')) {
                        clean = clean.replace(/\bnumpy\b/gi, '');
                    }

                    return clean
                        .replace(/\s+/g, ' ')
                        .replace(/\s+([.,;!])/g, '$1')
                        .trim();
                };

                if (proj.description) {
                    proj.description = sanitizeString(proj.description);
                }

                if (proj.highlights && Array.isArray(proj.highlights)) {
                    proj.highlights = proj.highlights.map(h => sanitizeString(h)).filter(Boolean);
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
        return {
            personalInfo: {
                name: defaultProfile?.personalInfo?.name || '',
                email: '',
                phone: '',
                location: '',
                linkedin: '',
                github: ''
            },
            skills: {
                technical: [],
                tools: [],
                soft: []
            },
            experience: [],
            education: [],
            projects: [],
            certifications: []
        };
    }

    const filled = JSON.parse(JSON.stringify(profile));

    // --- personalInfo: only fill missing name if absolutely blank ---
    if (!filled.personalInfo) {
        filled.personalInfo = {
            name: defaultProfile?.personalInfo?.name || '',
            email: '',
            phone: '',
            location: '',
            linkedin: '',
            github: ''
        };
    } else {
        if (!filled.personalInfo.name) filled.personalInfo.name = defaultProfile?.personalInfo?.name || '';
        if (!filled.personalInfo.email) filled.personalInfo.email = '';
        if (!filled.personalInfo.phone) filled.personalInfo.phone = '';
        if (!filled.personalInfo.location) filled.personalInfo.location = '';
        if (!filled.personalInfo.linkedin) filled.personalInfo.linkedin = '';
        if (!filled.personalInfo.github) filled.personalInfo.github = '';
    }

    // --- skills: normalize structure without falling back to mock data details ---
    if (Array.isArray(filled.skills)) {
        const flatSkills = filled.skills.filter(Boolean);
        filled.skills = {
            technical: flatSkills,
            tools: [],
            soft: []
        };
    } else if (!filled.skills || typeof filled.skills !== 'object') {
        filled.skills = {
            technical: [],
            tools: [],
            soft: []
        };
    } else {
        if (!Array.isArray(filled.skills.technical)) filled.skills.technical = [];
        if (!Array.isArray(filled.skills.tools)) filled.skills.tools = [];
        if (!Array.isArray(filled.skills.soft)) filled.skills.soft = [];
    }

    // --- personal history: preserve as empty if not provided ---
    if (!Array.isArray(filled.experience)) filled.experience = [];
    if (!Array.isArray(filled.education)) filled.education = [];
    if (!Array.isArray(filled.projects)) filled.projects = [];
    if (!Array.isArray(filled.certifications)) filled.certifications = [];

    return filled;
}

module.exports = {
    generateTailoredResume,
    createBlueprintEnhancedPrompt,
    generateEvidenceCards,
    trackEvidenceUsage,
    deduplicateEvidenceUsage,
    cleanAndValidateJSON,
    safeLLMExecution,
    cleanTailoredResume,
    fillEmptyProfileSections
};
