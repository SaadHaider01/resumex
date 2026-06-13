const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), override: true });
const { parseJobDescription } = require('../services/jdParser');
const { generateTailoredResume } = require('../services/resumeGenerator');
const { initializeProvider } = require('../services/llmProvider');

const provider = initializeProvider({
    provider: 'openrouter',
    apiKey: process.env.OPENROUTER_API_KEY,
    model: 'openrouter/free'
});

const mockUserProfile = {
    personalInfo: { name: 'Saad Haider' },
    skills: { technical: ['JavaScript', 'TypeScript', 'Python'] },
    experience: [
        {
            company: 'TechCorp Inc.',
            position: 'Senior Software Engineer',
            duration: '1/2021 - Present',
            achievements: [
                'Led development of REST API microservices serving 1M+ users',
                'Built responsive frontend modules using React and Tailwind',
                'Managed AWS cloud deployments and CI/CD pipelines'
            ]
        }
    ],
    certifications: ['AWS Certified Solutions Architect'],
    projects: [
        {
            name: 'ResumeX',
            languages: ['JavaScript'],
            technologies: ['JavaScript'],
            description: 'Chrome Extension logic'
        }
    ]
};

const jd = 'React Frontend Engineer. Required: React, JavaScript, CSS, HTML5.';

async function run() {
    const llmCallWrapper = async (prompt) => {
        const completion = await provider.client.chat.completions.create({
            model: provider.defaultModel,
            messages: [
                { role: 'system', content: 'You are an expert resume writer. Return valid JSON only.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 3000
        });
        let content = completion.choices[0]?.message?.content || '{}';
        if (content.startsWith('```json')) {
            content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (content.startsWith('```')) {
            content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        return JSON.parse(content);
    };

    try {
        await generateTailoredResume(jd, mockUserProfile, 'SaadHaider01', llmCallWrapper);
        console.log("Success!");
    } catch (e) {
        console.error("Stack Trace:", e);
    }
}

run();
