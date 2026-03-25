/**
 * Helper file for updating cover letter endpoint to use LLM provider
 */

// This is the updated cover letter endpoint code
// To be integrated into server.js

// POST /api/generate-cover-letter - Generate tailored cover letter
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
        const { createCoverLetterPrompt } = require('./promptTemplate');
        const prompt = createCoverLetterPrompt({
            jobDescription,
            tailoringBlueprint,
            resumeJSON,
            company,
            jobTitle
        });

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
