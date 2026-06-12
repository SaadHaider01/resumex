require('dotenv').config({ override: true });
const { initializeProvider } = require('../services/llmProvider');
const { createResumePrompt } = require('../promptTemplate');

const provider = initializeProvider({
    provider: 'openrouter',
    apiKey: process.env.OPENROUTER_API_KEY,
    model: 'openrouter/free'
});

const jobDescription = `Mock Job Description Page
Use this page to test the tailoring pipeline.
Required Tech Stack & Skills:
JavaScript, TypeScript, Python, HTML5, CSS3, Git, GitHub, RESTful APIs.
We need an intern who is passionate about coding.`;

const userProfile = {
    personalInfo: {
        name: "Saad Haider",
        linkedin: "https://www.linkedin.com/in/saad-haider-455123258",
        github: "https://github.com/SaadHaider01"
    },
    summary: "Full stack developer",
    skills: {
        technical: ["JavaScript", "TypeScript", "Python", "HTML5", "CSS3", "RESTful APIs", "Git", "GitHub"],
        tools: [],
        soft: ["collaborative communication", "remote teamwork"]
    },
    experience: [
        {
            company: "Self Employed Portfolio Projects",
            position: "Full Stack Developer",
            duration: "2023 – Present",
            location: "Remote",
            achievements: [
                "Designed and deployed a browser based AI assistant using Python, Whisper STT, and Edge TTS, reducing user setup time by 40%",
                "Built responsive front end components with React and TypeScript, integrating them with RESTful APIs to deliver a seamless user experience",
                "Managed version control with Git and GitHub, creating clear commit histories and pull requests for efficient collaboration"
            ]
        }
    ],
    education: [],
    projects: [
        {
            name: "resumex",
            description: "A repository demonstrating resume generation and auto-fill capabilities",
            languages: ["JavaScript"]
        },
        {
            name: "J.A.R.V.I.S",
            description: "An advanced, locally-hosted AI personal assistant",
            languages: ["Python"]
        },
        {
            name: "LInguaVoice",
            description: "A voice-driven language learning tool",
            languages: ["JavaScript"]
        }
    ]
};

const blueprint = {
    matchedSkills: ["javascript", "typescript", "python"],
    missingSkills: ["git", "github", "restful"],
    recommendedProjects: [
        { name: "resumex", relevanceScore: 0.9 },
        { name: "J.A.R.V.I.S", relevanceScore: 0.8 },
        { name: "LInguaVoice", relevanceScore: 0.7 }
    ],
    experienceMatchLevel: "Moderate",
    keywordInjectionList: ["javascript", "typescript", "python", "git", "github", "restful api"]
};

const prompt = createResumePrompt(jobDescription, userProfile, blueprint);

async function testCall() {
    try {
        console.log("Calling OpenRouter with model openrouter/free...");
        const completion = await provider.client.chat.completions.create({
            model: provider.defaultModel,
            messages: [
                { role: 'system', content: 'You are an expert resume writer specializing in ATS optimization. Always return valid JSON only, with no additional text or markdown formatting.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 6000
        });
        console.log("Content returned:", completion.choices[0]?.message?.content);
    } catch (e) {
        console.error("Call failed:", e);
    }
}

testCall();
