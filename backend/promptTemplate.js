/**
 * LLM Prompt Template for Resume Tailoring
 * 
 * This prompt instructs the AI to generate an ATS-optimized resume
 * tailored to a specific job description
 */

/**
 * Creates a blueprint-enhanced resume prompt
 * 
 * @param {string} jobDescription - Raw job description
 * @param {Object} userProfile - User profile data
 * @param {Object} tailoringBlueprint - Tailoring blueprint from tailoringService
 * @returns {string} Enhanced prompt
 */
function createResumePrompt(jobDescription, userProfile, tailoringBlueprint = null) {
  // If no blueprint provided, use basic prompt
  if (!tailoringBlueprint) {
    return createBasicPrompt(jobDescription, userProfile);
  }

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
8. For every project, the bullet points in 'highlights' MUST strictly follow the STAR (Situation/Task, Action, Result) methodology. Specifically describe the challenge (Situation/Task), the precise action taken (citing the skills, languages, or tools used), and a quantifiable outcome (Result, e.g., 'improving response times by 30%').
9. For every project, the 'technologies' array must list all programming languages, tools, and frameworks used.
10. STRICTOR RULES AGAINST HALLUCINATION:
    - Use ONLY the actual experience listed in the USER PROFILE. If it contains no experience or only freelancing, use that. Do not invent or add fake jobs, companies, or dates. If empty, return "experience": [].
    - Use ONLY the actual education listed in the USER PROFILE. Do not invent or add fake degrees or universities. If empty, return "education": [].
    - Use ONLY the actual projects listed in the USER PROFILE (e.g., 'resumex', 'J.A.R.V.I.S', 'LInguaVoice'). Do not invent other projects (like portfolio websites, static blogs, etc.). If empty, return "projects": [].
11. Return ONLY valid JSON, no additional text or explanation

JOB DESCRIPTION:
${jobDescription}

USER PROFILE:
${JSON.stringify(userProfile, null, 2)}

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
1. **Skills Section**: Prioritize MATCHED SKILLS at the top of the technical skills list
2. **Projects Section**: Include RECOMMENDED PROJECTS first, emphasizing their relevance
3. **Keyword Integration**: Naturally weave in keywords from KEYWORD INJECTION LIST throughout achievements and descriptions
4. **Experience Bullet Points**: Rewrite to highlight experiences that match the job requirements
5. **Professional Summary**: Incorporate matched skills and align with experience match level
6. **Missing Skills**: If user has transferable skills or related experience, mention them contextually
7. **Tone & Seniority**: ${toneGuidance}

Generate the tailored resume now:`;
}

/**
 * Creates basic prompt without blueprint (backward compatibility)
 */
function createBasicPrompt(jobDescription, userProfile) {
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
8. For every project, the bullet points in 'highlights' MUST strictly follow the STAR (Situation/Task, Action, Result) methodology. Specifically describe the challenge (Situation/Task), the precise action taken (citing the skills, languages, or tools used), and a quantifiable outcome (Result, e.g., 'improving response times by 30%').
9. For every project, the 'technologies' array must list all programming languages, tools, and frameworks used.
10. STRICTOR RULES AGAINST HALLUCINATION:
    - Use ONLY the actual experience listed in the USER PROFILE. If it contains no experience or only freelancing, use that. Do not invent or add fake jobs, companies, or dates. If empty, return "experience": [].
    - Use ONLY the actual education listed in the USER PROFILE. Do not invent or add fake degrees or universities. If empty, return "education": [].
    - Use ONLY the actual projects listed in the USER PROFILE (e.g., 'resumex', 'J.A.R.V.I.S', 'LInguaVoice'). Do not invent other projects (like portfolio websites, static blogs, etc.). If empty, return "projects": [].
11. Return ONLY valid JSON, no additional text or explanation

JOB DESCRIPTION:
${jobDescription}

USER PROFILE:
${JSON.stringify(userProfile, null, 2)}

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
1. Analyze the job description for required skills, experience level, and key responsibilities
2. Reorder and emphasize user's experiences that best match the job requirements
3. Rewrite achievement bullet points to highlight relevant accomplishments
4. Include job-specific keywords naturally (role titles, technologies, methodologies)
5. Prioritize the most relevant skills and projects
6. If user lacks certain required skills, emphasize transferable skills
7. Keep the resume focused and concise (prioritize quality over quantity)

Generate the tailored resume now:`;
}

/**
 * Formats recommended projects for prompt
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
 */
function getToneGuidance(experienceMatchLevel) {
  switch (experienceMatchLevel) {
    case 'High':
      return '📈 Confident and results-driven. Emphasize leadership, impact, and senior-level contributions.';
    case 'Moderate':
      return '📊 Balanced and growth-oriented. Emphasize learning agility, relevant achievements, and potential.';
    case 'Low':
      return '📉 Eager and adaptive. Emphasize transferable skills, quick learning, and enthusiasm for the role.';
    default:
      return '📊 Professional and achievement-focused.';
  }
}

const { createCoverLetterPrompt } = require('./promptTemplate_coverLetter');

module.exports = {
  createResumePrompt,
  createCoverLetterPrompt
};

