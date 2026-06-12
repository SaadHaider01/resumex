// Use global fetch in Node 24

const payload = {
    jobDescription: `Mock Job Description Page
Use this page to test the tailoring pipeline.
Required Tech Stack & Skills:
JavaScript, TypeScript, Python, HTML5, CSS3, Git, GitHub, RESTful APIs.
We need an intern who is passionate about coding.`,
    userProfile: {
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
    },
    githubUsername: "SaadHaider01",
    linkedinProfile: "https://www.linkedin.com/in/saad-haider-455123258"
};

async function runTest() {
    try {
        console.log("Sending request to local server on port 3001...");
        const response = await fetch('http://localhost:3001/api/generate-tailored-resume', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP ${response.status}: ${text}`);
        }

        const data = await response.json();
        console.log("API response keys:", Object.keys(data));
        console.log("Success:", data.success);
        console.log("Tailored Resume JSON:");
        console.log(JSON.stringify(data.resume, null, 2));
    } catch (error) {
        console.error("Test failed:", error);
    }
}

runTest();
