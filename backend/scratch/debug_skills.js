const { parseJobDescription } = require('../services/jdParser');
const { getCanonicalTech, matchTech } = require('../services/technologySynonyms');
const { analyzeRepositories } = require('../services/repositoryIntelligenceService');
const { analyzeProfessionalProfile } = require('../services/professionalIntelligenceService');
const { generateTailoringBlueprint } = require('../services/tailoringService');

const mockUserProfile = {
    personalInfo: {
        name: 'Saad Haider',
        email: 'saad.haider@example.com',
    },
    skills: {
        technical: ['JavaScript', 'TypeScript', 'Python', 'HTML5', 'CSS3'],
        tools: ['Git', 'GitHub', 'Docker', 'Kubernetes'],
    },
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
        },
        {
            company: 'Startup LLC',
            position: 'Software Developer Intern',
            duration: '6/2019 - 12/2020',
            achievements: [
                'Created node.js backend scripts and designed MongoDB database schemas',
                'Built Chrome Extension prototype with manifest.json for form autofill automation'
            ]
        }
    ],
    certifications: [
        'AWS Certified Solutions Architect',
        'Google Data Analytics Certificate'
    ]
};

const mockRepos = [
    {
        name: 'ResumeX',
        languages: ['JavaScript', 'HTML', 'CSS'],
        stars: 15,
        url: 'https://github.com/SaadHaider01/resumex',
        mockTree: ['manifest.json', 'extension/background.js', 'package.json', 'README.md'],
        mockFiles: {
            'manifest.json': JSON.stringify({ manifest_version: 3, name: 'ResumeX' }),
            'package.json': JSON.stringify({ dependencies: { express: '^4.18.2', pdfkit: '^0.13.0' } }),
            'README.md': 'ResumeX is a Chrome extension that automates form autofilling and LinkedIn scraping with a backend PDF generation service.'
        }
    }
];

async function debug() {
    const githubResult = await analyzeRepositories({ githubUsername: 'SaadHaider01', repositories: mockRepos });
    const repoProfiles = githubResult.analyzedRepositories;
    const pieProfile = analyzeProfessionalProfile({
        linkedinProfile: {
            experience: mockUserProfile.experience,
            certifications: mockUserProfile.certifications,
            rawSkills: mockUserProfile.skills.technical
        }
    });

    const finalProfile = JSON.parse(JSON.stringify(mockUserProfile));
    finalProfile.projects = repoProfiles;
    finalProfile.pieResult = pieProfile;

    const jdText = "Develop Chrome browser extensions. Knowledge of manifest.json, background scripts, content scripts, and DOM scraping.";
    const parsedJD = parseJobDescription(jdText);
    const blueprint = generateTailoringBlueprint(parsedJD, finalProfile, githubResult, pieProfile);

    console.log('JD skills parsed:', parsedJD.skills);
    console.log('Blueprint matchedSkills:', blueprint.matchedSkills);
    console.log('Blueprint missingSkills:', blueprint.missingSkills);
}

debug().catch(console.error);
