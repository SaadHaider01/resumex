/**
 * Cover Letter Prompt Template
 * 
 * Creates prompts for generating tailored cover letters aligned with resume
 */

function createCoverLetterPrompt({ jobDescription, tailoringBlueprint, resumeJSON, company, jobTitle }) {
    const { matchedSkills, missingSkills, experienceMatchLevel, recommendedProjects } = tailoringBlueprint;
    const { professionalSummary, skills, experience, projects } = resumeJSON;

    // Determine tone based on experience match
    const toneGuidance = getCoverLetterTone(experienceMatchLevel);

    // Get top projects to mention
    const topProjects = recommendedProjects?.slice(0, 2) || projects?.slice(0, 2) || [];

    return `You are an expert career consultant and cover letter writer specializing in ATS optimization.

Your task is to write a compelling, professional cover letter for the following job application.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 JOB INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Company: ${company}
Position: ${jobTitle}

Job Description:
${jobDescription}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 CANDIDATE INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Professional Summary:
${professionalSummary}

Core Skills:
${formatSkillsList(skills)}

Recent Experience:
${formatExperienceBrief(experience)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 TAILORING INTELLIGENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ MATCHED SKILLS (Highlight These):
${matchedSkills?.join(', ') || 'None identified'}

⚠️ MISSING SKILLS (Address Positively):
${missingSkills?.join(', ') || 'None identified'}

🚀 RELEVANT PROJECTS (Mention These):
${formatProjectsForCoverLetter(topProjects)}

📊 EXPERIENCE MATCH LEVEL: ${experienceMatchLevel}
${toneGuidance}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✍️ WRITING GUIDELINES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STRUCTURE:
1. Opening paragraph:
   - State position and company explicitly
   - Express genuine interest
   - Brief hook (1-2 sentences about why you're a fit)

2. Body paragraphs (2-3):
   - Paragraph 1: Highlight MATCHED SKILLS with concrete examples
   - Paragraph 2: Discuss relevant projects from RELEVANT PROJECTS list
   - Paragraph 3 (if needed): Address MISSING SKILLS positively
     * Show transferable skills
     * Mention quick learning ability
     * Demonstrate enthusiasm to grow

3. Closing paragraph:
   - Reiterate interest
   - Call to action (discussion/interview)
   - Professional closing

TONE REQUIREMENTS:
${toneGuidance}

CRITICAL RULES:
✅ DO:
- Use specific company name "${company}" and job title "${jobTitle}"
- Reference MATCHED SKILLS naturally throughout
- Mention at least 1-2 projects from RELEVANT PROJECTS
- Keep it concise (250-350 words)
- Use active voice and strong action verbs
- Show enthusiasm and cultural fit
- Align with the resume's professional summary

❌ DON'T:
- Use generic "To Whom It May Concern"
- Repeat resume verbatim
- Use clichés like "team player" without context
- Mention salary expectations
- Be overly humble or boastful
- Use first person excessively
- Write more than one page

ATS OPTIMIZATION:
- Include job title and company name
- Use industry-standard terminology
- Mirror key phrases from job description
- Use keywords from MATCHED SKILLS list

Generate the cover letter now. Return ONLY the cover letter text, no additional commentary.`;
}

/**
 * Helper: Format skills list
 */
function formatSkillsList(skills) {
    if (!skills) return 'Not specified';

    const allSkills = [
        ...(skills.technical || []),
        ...(skills.tools || []),
        ...(skills.soft || [])
    ];

    return allSkills.slice(0, 10).join(', ');
}

/**
 * Helper: Format experience brief
 */
function formatExperienceBrief(experience) {
    if (!experience || experience.length === 0) return 'Not specified';

    const latest = experience[0];
    return `${latest.position || 'Position'} at ${latest.company || 'Company'} (${latest.duration || 'Duration'})`;
}

/**
 * Helper: Format projects for cover letter
 */
function formatProjectsForCoverLetter(projects) {
    if (!projects || projects.length === 0) return 'None identified';

    return projects.map((p, idx) => {
        if (typeof p === 'string') {
            return `${idx + 1}. ${p}`;
        }
        return `${idx + 1}. ${p.name || p}${p.relevanceScore ? ` (Relevance: ${(p.relevanceScore * 100).toFixed(0)}%)` : ''}`;
    }).join('\n');
}

/**
 * Helper: Get tone guidance for cover letter
 */
function getCoverLetterTone(experienceMatchLevel) {
    switch (experienceMatchLevel) {
        case 'High':
            return `📈 CONFIDENT & RESULTS-DRIVEN
- Lead with accomplishments and impact
- Demonstrate leadership and expertise
- Position yourself as someone who can contribute immediately
- Use assertive language ("will deliver", "have successfully led")`;

        case 'Moderate':
            return `📊 BALANCED & GROWTH-ORIENTED
- Show both competence and eagerness to grow
- Highlight relevant experience while showing adaptability
- Emphasize learning agility and potential
- Use collaborative language ("excited to contribute", "ready to apply my skills")`;

        case 'Low':
            return `📉 ENTHUSIASTIC & ADAPTIVE
- Lead with passion and eagerness to learn
- Emphasize transferable skills and quick learning
- Show cultural fit and attitude
- Use growth-oriented language ("eager to develop", "passionate about learning")
- Address skill gaps proactively as opportunities`;

        default:
            return `📊 PROFESSIONAL & ACHIEVEMENT-FOCUSED
- Strike a balance between confidence and humility
- Highlight relevant accomplishments
- Show genuine interest in the role`;
    }
}

module.exports = {
    createCoverLetterPrompt,
    formatSkillsList,
    formatExperienceBrief,
    formatProjectsForCoverLetter,
    getCoverLetterTone
};
