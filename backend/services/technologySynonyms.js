/**
 * Technology Synonyms Mapping Module
 * 
 * Provides canonical technology mappings and normalization functions
 * to enable accurate technology matching across RIE and PIE.
 */

const SYNONYMS = {
    // Languages
    'js': 'JavaScript',
    'javascript': 'JavaScript',
    'ts': 'TypeScript',
    'typescript': 'TypeScript',
    'py': 'Python',
    'python': 'Python',
    'cpp': 'C++',
    'c++': 'C++',
    'csharp': 'C#',
    'c#': 'C#',
    'sql': 'SQL',
    
    // Frontend
    'reactjs': 'React',
    'react.js': 'React',
    'react': 'React',
    'vuejs': 'Vue.js',
    'vue.js': 'Vue.js',
    'vue': 'Vue.js',
    'angularjs': 'Angular',
    'angular.js': 'Angular',
    'angular': 'Angular',
    'nextjs': 'Next.js',
    'next.js': 'Next.js',
    'next': 'Next.js',
    'tailwind': 'Tailwind CSS',
    'tailwindcss': 'Tailwind CSS',
    'html': 'HTML5',
    'html5': 'HTML5',
    'css': 'CSS3',
    'css3': 'CSS3',
    
    // Backend
    'nodejs': 'Node.js',
    'node.js': 'Node.js',
    'node': 'Node.js',
    'expressjs': 'Express',
    'express.js': 'Express',
    'express': 'Express',
    'fastapi': 'FastAPI',
    'flask': 'Flask',
    'django': 'Django',
    
    // Cloud & DevOps
    'aws': 'AWS',
    'amazon web services': 'AWS',
    'amazon web service': 'AWS',
    'gcp': 'GCP',
    'google cloud platform': 'GCP',
    'google cloud': 'GCP',
    'k8s': 'Kubernetes',
    'kubernetes': 'Kubernetes',
    'docker': 'Docker',
    'terraform': 'Terraform',
    'ci/cd': 'CI/CD',
    'cicd': 'CI/CD',
    'pipeline': 'CI/CD',
    
    // Databases
    'mongodb': 'MongoDB',
    'mongo': 'MongoDB',
    'postgres': 'PostgreSQL',
    'postgresql': 'PostgreSQL',
    'redis': 'Redis',
    
    // APIs & Methods
    'rest api': 'REST API',
    'restful api': 'REST API',
    'rest apis': 'REST API',
    'rest endpoints': 'REST API',
    'rest': 'REST API',
    'graphql': 'GraphQL',
    
    // Speech & AI
    'whisper': 'Whisper',
    'openai-whisper': 'Whisper',
    'stt': 'Speech-to-Text',
    'speech-to-text': 'Speech-to-Text',
    'speech recognition': 'Speech-to-Text',
    'tts': 'Text-to-Speech',
    'text-to-speech': 'Text-to-Speech',
    'text to speech': 'Text-to-Speech',
    'openai': 'OpenAI',
    'openai api': 'OpenAI',
    'gemini': 'Gemini',
    'gemini api': 'Gemini',

    // Chrome Extensions & Automation
    'chrome extension': 'Chrome Extension',
    'browser extension': 'Chrome Extension',
    'manifest.json': 'Chrome Extension',
    'autofill': 'Chrome Extension',
    'form autofill': 'Chrome Extension',
    'pdfkit': 'PDF Generation',
    'pdf generation': 'PDF Generation',
    'pdf': 'PDF Generation',
    'linkedin scraping': 'Browser Automation',
    'scraping': 'Browser Automation',
    'puppeteer': 'Browser Automation',
    'selenium': 'Browser Automation',

    // Speech APIs
    'web speech api': 'Web Speech API',
    'speech api': 'Web Speech API',
    'speechsynthesis': 'Web Speech API',
    'language learning': 'Web Speech API',

    // Analytics
    'data analytics': 'Data Analytics',
    'analytics': 'Data Analytics',
    'google data analytics': 'Data Analytics'
};

/**
 * Normalizes a technology/skill name to its canonical form
 * @param {string} name - Raw technology name
 * @returns {string} Canonical name, or normalized lowercase if not in synonym map
 */
function getCanonicalTech(name) {
    if (!name) return '';
    const clean = name.toString().toLowerCase().trim();
    if (SYNONYMS[clean]) {
        return SYNONYMS[clean];
    }
    // Return capitalized first letter as fallback
    return name.toString().trim();
}

/**
 * Checks if two technology names are synonyms/matches
 * @param {string} name1 - First tech name
 * @param {string} name2 - Second tech name
 * @returns {boolean} True if they match
 */
function matchTech(name1, name2) {
    if (!name1 || !name2) return false;
    const norm1 = getCanonicalTech(name1).toLowerCase();
    const norm2 = getCanonicalTech(name2).toLowerCase();
    return norm1 === norm2 || norm1.includes(norm2) || norm2.includes(norm1);
}

module.exports = {
    getCanonicalTech,
    matchTech,
    SYNONYMS
};
