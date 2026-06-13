const fs = require('fs');
const path = require('path');

// Mock job description matching ResumeX
const mockJD = `
Full-Stack Software Engineer (Chrome Extension Specialist)
We are seeking a developer to build interactive, automated workflow tools.
Responsibilities:
- Build a Chrome browser extension with manifest.json, background workers, and content scripts.
- Implement DOM scraping and form autofill automation.
- Create backend APIs using Node.js, Express, and MongoDB.
- Generate and export clean PDF documents dynamically (e.g. using pdfkit).
Requirements:
- Strong experience in JavaScript, TypeScript, and Python.
- Git, GitHub, and collaborative workflows.
`;

// Profile with empty sections to test fallback resolution
const emptyProfile = {
    personalInfo: {
        name: 'Saad Haider',
        email: 'saadhaider349@gmail.com',
        phone: '6205907774',
        location: '',
        github: 'https://github.com/SaadHaider01',
        linkedin: 'https://www.linkedin.com/in/saad-haider-455123258'
    },
    skills: {
        technical: ['JavaScript', 'TypeScript', 'Python', 'HTML', 'CSS', 'PHP'],
        tools: ['Git', 'GitHub'],
        soft: []
    },
    experience: [],
    education: [],
    projects: [],
    certifications: []
};

async function testApiRoute() {
    console.log('📡 Sending request to API...');
    try {
        const response = await fetch('http://localhost:3001/api/generate-tailored-resume', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jobDescription: mockJD,
                userProfile: emptyProfile,
                githubUsername: 'SaadHaider01'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API returned status ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('🎉 API Request Succeeded!');
        console.log('Metadata:', JSON.stringify(data.metadata, null, 2));
        
        const resume = data.resume;
        console.log('\n📄 Generated Resume Sections Validation:');
        console.log('Summary:', resume.professionalSummary ? '✅ Present' : '❌ Missing');
        console.log('Skills:', resume.skills?.technical?.length > 0 ? '✅ Present' : '❌ Missing');
        console.log('Experience:', resume.experience?.length > 0 ? `✅ Present (${resume.experience.length} items)` : '❌ Missing');
        console.log('Projects:', resume.projects?.length > 0 ? `✅ Present (${resume.projects.length} items)` : '❌ Missing');
        console.log('Education:', resume.education?.length > 0 ? `✅ Present (${resume.education.length} items)` : '❌ Missing');
        console.log('Certifications:', resume.certifications?.length > 0 ? `✅ Present (${resume.certifications.length} items)` : '❌ Missing');

        if (
            resume.experience?.length > 0 &&
            resume.projects?.length > 0 &&
            resume.education?.length > 0 &&
            resume.certifications?.length > 0
        ) {
            console.log('\n🌟 SUCCESS: All sections are populated!');
        } else {
            console.error('\n⚠️ FAILURE: Some sections are still missing!');
        }

    } catch (error) {
        console.error('❌ API Request Failed:', error.message);
    }
}

testApiRoute();
