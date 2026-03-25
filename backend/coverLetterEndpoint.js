
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

        // Call OpenAI API
        console.log('  🤖 Calling OpenAI API...');
        const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert career consultant and cover letter writer. Write compelling, professional cover letters that align with the candidate\'s resume.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.8,
            max_tokens: 1000
        });

        const coverLetter = completion.choices[0].message.content.trim();

        console.log('  ✅ Cover letter generated successfully\n');

        res.json({
            success: true,
            coverLetter,
            metadata: {
                model: completion.model,
                tokensUsed: completion.usage.total_tokens,
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
