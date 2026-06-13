/**
 * Cover Letter Service
 * 
 * Generates job-specific cover letters using tailoring blueprint and resume data
 */

const { createCoverLetterPrompt } = require('../promptTemplate');

/**
 * Generate a tailored cover letter
 * @param {Object} params - Input parameters
 * @param {string} params.jobDescription - Job description text
 * @param {Object} params.tailoringBlueprint - Tailoring blueprint from Phase 4
 * @param {Object} params.resumeJSON - Generated resume from Phase 5
 * @param {string} params.company - Company name
 * @param {string} params.jobTitle - Job title
 * @param {Function} llmCallFn - LLM calling function (injected for testing)
 * @returns {Promise<Object>} Generated cover letter
 */
async function generateCoverLetter(params, llmCallFn) {
    const { jobDescription, tailoringBlueprint, resumeJSON, company, jobTitle } = params;

    // Validation (allow company to be empty string)
    if (!jobDescription || !tailoringBlueprint || !resumeJSON || company === undefined || !jobTitle) {
        throw new Error('Missing required parameters: jobDescription, tailoringBlueprint, resumeJSON, company, jobTitle');
    }

    // Create enhanced prompt with tailoring intelligence
    const prompt = createCoverLetterPrompt({
        jobDescription,
        tailoringBlueprint,
        resumeJSON,
        company: company || 'Hiring Company',
        jobTitle
    });

    // Call LLM to generate cover letter
    const coverLetter = await llmCallFn(prompt);

    return {
        coverLetter,
        metadata: {
            company: company || 'Hiring Company',
            jobTitle,
            experienceMatchLevel: tailoringBlueprint.experienceMatchLevel,
            matchedSkillsCount: tailoringBlueprint.matchedSkills?.length || 0,
            missingSkillsCount: tailoringBlueprint.missingSkills?.length || 0
        }
    };
}

/**
 * Validate cover letter input
 */
function validateCoverLetterInput(params) {
    const required = ['jobDescription', 'tailoringBlueprint', 'resumeJSON', 'jobTitle'];
    const missing = required.filter(field => !params[field]);
    if (params.company === undefined) {
        missing.push('company');
    }

    if (missing.length > 0) {
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    // Validate tailoring blueprint structure
    if (!params.tailoringBlueprint.matchedSkills || !params.tailoringBlueprint.experienceMatchLevel) {
        throw new Error('Invalid tailoringBlueprint: must contain matchedSkills and experienceMatchLevel');
    }

    // Validate resume JSON structure
    if (!params.resumeJSON.professionalSummary) {
        throw new Error('Invalid resumeJSON: must contain professionalSummary');
    }

    return true;
}

module.exports = {
    generateCoverLetter,
    validateCoverLetterInput
};
