/**
 * Job Description Parser Module
 * 
 * Converts raw job description text into structured data
 * for use in resume tailoring.
 * 
 * NO LLM usage - pure JavaScript logic
 */

// Common tech skills to detect (expandable)
const COMMON_SKILLS = [
    // Languages
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Ruby', 'Go', 'Rust', 'PHP',
    'Swift', 'Kotlin', 'Scala', 'R', 'SQL', 'HTML', 'CSS', 'Dart',

    // Frontend
    'React', 'Vue', 'Angular', 'Svelte', 'Next.js', 'Nuxt', 'jQuery', 'Bootstrap', 'Tailwind',
    'Redux', 'MobX', 'Webpack', 'Vite', 'Sass', 'Less',

    // Backend
    'Node.js', 'Express', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Rails', 'Laravel',
    'ASP.NET', 'GraphQL', 'REST', 'REST API', 'RESTful', 'gRPC',

    // Databases
    'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Elasticsearch', 'DynamoDB', 'Cassandra',
    'Oracle', 'SQL Server', 'SQLite', 'Firebase',

    // Cloud & DevOps
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'K8s', 'Jenkins', 'CI/CD', 'Git', 'GitHub',
    'GitLab', 'Terraform', 'Ansible', 'CircleCI', 'Travis CI', 'GitHub Actions',

    // Testing
    'Jest', 'Mocha', 'Cypress', 'Selenium', 'JUnit', 'PyTest', 'Testing Library',

    // Other
    'Microservices', 'Agile', 'Scrum', 'TDD', 'Machine Learning', 'ML', 'AI', 'Data Science',
    'Linux', 'Unix', 'Nginx', 'Apache', 'RabbitMQ', 'Kafka'
];

// Common job role keywords
const ROLE_KEYWORDS = [
    'Engineer', 'Developer', 'Programmer', 'Architect', 'Lead', 'Senior', 'Junior', 'Principal',
    'Full Stack', 'Full-Stack', 'Frontend', 'Front-end', 'Backend', 'Back-end',
    'Software', 'Web', 'Mobile', 'iOS', 'Android', 'DevOps', 'Data', 'Machine Learning',
    'AI', 'QA', 'Test', 'Security', 'Cloud', 'Solutions', 'Staff'
];

/**
 * Main parsing function
 * @param {string} jobDescriptionText - Raw job description text
 * @returns {object} Structured job data
 */
function parseJobDescription(jobDescriptionText) {
    if (!jobDescriptionText || typeof jobDescriptionText !== 'string') {
        throw new Error('Job description must be a non-empty string');
    }

    const normalizedText = normalizeText(jobDescriptionText);

    return {
        role: extractRole(normalizedText, jobDescriptionText),
        skills: extractSkills(normalizedText),
        experience: extractExperience(normalizedText),
        keywords: extractKeywords(normalizedText)
    };
}

/**
 * Normalize text for easier parsing
 */
function normalizeText(text) {
    return text
        .replace(/\s+/g, ' ')  // Collapse whitespace
        .trim();
}

/**
 * Extract probable job role/title
 */
function extractRole(normalizedText, originalText) {
    // Strategy 1: Look for common patterns like "We are seeking a [ROLE]" or "Looking for a [ROLE]"
    const patterns = [
        /(?:seeking|looking for|hiring|position for|role for|need)\s+(?:an?|the)?\s*([^.,:;!?\n]{5,50})/i,
        /^([^.,:;!?\n]{5,50}?)(?:\s+position|\s+role|\s+opening)/i,
        /job title[:\s]+([^.,:;!?\n]{5,50})/i
    ];

    for (const pattern of patterns) {
        const match = normalizedText.match(pattern);
        if (match && match[1]) {
            const candidate = match[1].trim();
            // Check if it contains role-related keywords
            if (ROLE_KEYWORDS.some(keyword => candidate.toLowerCase().includes(keyword.toLowerCase()))) {
                return candidate;
            }
        }
    }

    // Strategy 2: Find the first sentence/phrase with role keywords
    const sentences = normalizedText.split(/[.!?\n]+/);
    for (const sentence of sentences.slice(0, 3)) {  // Check first 3 sentences
        for (const keyword of ROLE_KEYWORDS) {
            if (sentence.toLowerCase().includes(keyword.toLowerCase())) {
                // Extract a reasonable substring around the keyword
                const words = sentence.trim().split(' ');
                const keywordIndex = words.findIndex(w => w.toLowerCase().includes(keyword.toLowerCase()));
                if (keywordIndex !== -1) {
                    const start = Math.max(0, keywordIndex - 3);
                    const end = Math.min(words.length, keywordIndex + 4);
                    const extracted = words.slice(start, end).join(' ');
                    if (extracted.length > 5 && extracted.length < 60) {
                        return extracted;
                    }
                }
            }
        }
    }

    return '';  // Unable to determine role
}

/**
 * Extract technical skills from text
 */
function extractSkills(normalizedText) {
    const foundSkills = new Set();

    for (const skill of COMMON_SKILLS) {
        // Case-insensitive whole-word matching
        const regex = new RegExp(`\\b${escapeRegex(skill)}\\b`, 'gi');
        if (regex.test(normalizedText)) {
            foundSkills.add(skill);
        }
    }

    // Also check for "X.js" patterns (e.g., "Next.js", "Vue.js")
    const jsLibPattern = /\b([A-Z][a-z]+\.js)\b/g;
    let match;
    while ((match = jsLibPattern.exec(normalizedText)) !== null) {
        foundSkills.add(match[1]);
    }

    return Array.from(foundSkills).sort();
}

/**
 * Extract experience requirements
 */
function extractExperience(normalizedText) {
    // Common patterns for experience
    const patterns = [
        /(\d+\+?\s*(?:to|\-|–)\s*\d+\s*years?)/i,  // "3-5 years", "3 to 5 years"
        /(\d+\+\s*years?)/i,                        // "3+ years"
        /(\d+\s*years?)/i,                          // "3 years"
        /(minimum|minimum of|at least)\s+(\d+)\s*years?/i,
        /(\d+)\s*years?\s+(?:of\s+)?experience/i
    ];

    for (const pattern of patterns) {
        const match = normalizedText.match(pattern);
        if (match) {
            // Return the most specific match group
            return match[1] || match[0];
        }
    }

    return null;
}

/**
 * Extract important keywords (nouns, key phrases)
 */
function extractKeywords(normalizedText) {
    const keywords = new Set();

    // Important domain keywords to look for
    const importantTerms = [
        'full stack', 'full-stack', 'frontend', 'front-end', 'backend', 'back-end',
        'microservices', 'scalable', 'scalability', 'cloud', 'distributed',
        'real-time', 'real time', 'api', 'apis', 'database', 'mobile',
        'responsive', 'agile', 'scrum', 'devops', 'ci/cd', 'testing',
        'security', 'authentication', 'authorization', 'performance',
        'optimization', 'deployment', 'monitoring', 'architecture',
        'leadership', 'mentorship', 'team', 'collaboration', 'remote',
        'startup', 'enterprise', 'saas', 'b2b', 'b2c'
    ];

    const lowerText = normalizedText.toLowerCase();

    for (const term of importantTerms) {
        if (lowerText.includes(term.toLowerCase())) {
            keywords.add(term);
        }
    }

    // Limit to most relevant keywords (max 15)
    return Array.from(keywords).slice(0, 15);
}

/**
 * Escape special regex characters
 */
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
    parseJobDescription
};
