/**
 * Professional Intelligence Engine (PIE)
 * 
 * Automatically profiles LinkedIn data, extracting seniority, capabilities, 
 * certifications, education, normalized skills, and building a Career Knowledge Graph
 * with capability maturity assessment and Career DNA profiling.
 */

const { getCanonicalTech, matchTech } = require('./technologySynonyms');

/**
 * Main profiling entry point
 * @param {Object} data - Input object containing linkedinProfile
 * @returns {Object} Output structured profile intelligence
 */
function analyzeProfessionalProfile(data) {
    const { linkedinProfile } = data;
    if (!linkedinProfile) {
        throw new Error('Invalid input: linkedinProfile is required');
    }

    console.log('🧠 PIE: Starting professional intelligence profiling...');

    // 1. Skill Normalization
    const skills = normalizeSkills(linkedinProfile.rawSkills || linkedinProfile.skills || []);

    // 2. Experience Intelligence
    const rawExp = linkedinProfile.experience || [];
    const experiences = rawExp.map(exp => analyzeExperience(exp));

    // 3. Certification Intelligence
    const rawCerts = linkedinProfile.certifications || [];
    const certifications = rawCerts.map(cert => analyzeCertification(cert));

    // 4. Education Intelligence
    const rawEdu = linkedinProfile.education || [];
    const education = rawEdu.map(edu => analyzeEducation(edu));

    // 5. Inferred Capabilities & Graph Builder
    const inferredCapabilities = buildCapabilities(experiences, certifications);

    // 6. Career DNA Profiler
    const careerSummary = buildCareerDNA(inferredCapabilities);

    // 7. General evidence logging
    const evidence = [
        {
            source: 'LinkedIn Profile Scrape',
            value: `Parsed ${experiences.length} experience(s), ${certifications.length} certification(s), and ${skills.length} normalized skill(s)`,
            confidence: 1.0
        }
    ];

    return {
        experiences,
        certifications,
        education,
        skills,
        inferredCapabilities,
        careerSummary,
        evidence
    };
}

/**
 * Normalizes LinkedIn skills using canonical synonyms
 */
function normalizeSkills(rawSkills) {
    if (!Array.isArray(rawSkills)) return [];
    
    // Normalize and filter out empty
    const normalized = rawSkills
        .map(skill => {
            const name = typeof skill === 'string' ? skill : (skill.name || '');
            return getCanonicalTech(name);
        })
        .filter(Boolean);

    // Deduplicate
    return [...new Set(normalized)];
}

/**
 * Helper to parse experience duration strings into total months
 * e.g., "1/2021 - 12/2023", "Jan 2021 - Present", "2021 - 2023"
 */
function calculateDurationInMonths(durationStr) {
    if (!durationStr || typeof durationStr !== 'string') return 0;
    
    const parts = durationStr.split('-').map(p => p.trim());
    if (parts.length < 2) return 12; // Default fallback: 1 year

    const parseDatePart = (part) => {
        if (part.toLowerCase().includes('present')) {
            // Current environment date is June 2026
            return { month: 5, year: 2026 }; // 0-indexed month
        }

        // Match M/YYYY or MM/YYYY
        const slashMatch = part.match(/^(\d{1,2})\/(\d{4})$/);
        if (slashMatch) {
            return { month: parseInt(slashMatch[1], 10) - 1, year: parseInt(slashMatch[2], 10) };
        }

        // Match Year only
        const yearMatch = part.match(/^(\d{4})$/);
        if (yearMatch) {
            return { month: 0, year: parseInt(yearMatch[1], 10) };
        }

        // Match "Month Year" (e.g. "Jan 2021")
        const monthNames = {
            jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
            jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
        };
        const words = part.toLowerCase().split(/\s+/);
        if (words.length >= 2) {
            const mStr = words[0].substring(0, 3);
            const yVal = parseInt(words[1], 10);
            if (monthNames[mStr] !== undefined && !isNaN(yVal)) {
                return { month: monthNames[mStr], year: yVal };
            }
        }

        return { month: 0, year: 2020 }; // Safe fallback
    };

    const start = parseDatePart(parts[0]);
    const end = parseDatePart(parts[1]);

    const yearsDiff = end.year - start.year;
    const monthsDiff = end.month - start.month;
    const totalMonths = (yearsDiff * 12) + monthsDiff;

    return Math.max(totalMonths, 1);
}

/**
 * Infers seniority level from position title and achievements text
 */
function inferSeniority(title, responsibilities) {
    const text = `${title} ${responsibilities.join(' ')}`.toLowerCase();
    
    if (/\bintern\b|\bco-op\b|\bapprentice\b|\btrainee\b/i.test(text)) {
        return 'Intern';
    }
    if (/\bmanager\b|\bdirector\b|\bvp\b|\bhead\b|\bvp\b/i.test(title.toLowerCase())) {
        return 'Manager';
    }
    if (/\blead\b|\bprincipal\b|\bstaff\b|\barchitect\b|\bchief\b/i.test(title.toLowerCase())) {
        return 'Lead';
    }
    if (/\bsenior\b|\bsr\b|\bexperienced\b/i.test(text)) {
        return 'Senior';
    }
    if (/\bjunior\b|\bjr\b|\bentry\b|\bassociate\b/i.test(text)) {
        return 'Junior';
    }
    return 'Mid'; // Default Mid-level
}

/**
 * Analyzes a single experience entry, extracting seniority, capabilities, technologies
 */
function analyzeExperience(exp) {
    const title = exp.position || exp.title || 'Software Engineer';
    const company = exp.company || 'Company';
    const durationStr = exp.duration || '';
    const achievements = exp.achievements || exp.description 
        ? (typeof exp.description === 'string' ? exp.description.split('\n') : exp.achievements)
        : [];
    const responsibilities = achievements.map(a => a.trim()).filter(Boolean);

    const durationMonths = calculateDurationInMonths(durationStr);
    const seniorityLevel = inferSeniority(title, responsibilities);

    // Extract technologies from achievements and title
    const techSet = new Set();
    const allText = `${title} ${responsibilities.join(' ')}`;
    
    // Scrape matching synonyms
    const { SYNONYMS } = require('./technologySynonyms');
    Object.keys(SYNONYMS).forEach(term => {
        const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        if (regex.test(allText)) {
            techSet.add(SYNONYMS[term]);
        }
    });

    const technologies = Array.from(techSet);

    // Match Capabilities from title and description
    const inferredCapabilities = [];
    const capRules = [
        {
            capability: 'REST API Development',
            keywords: ['api', 'apis', 'rest', 'restful', 'endpoints', 'express', 'node', 'fastapi', 'flask', 'django', 'backend', 'routing', 'microservices'],
            confidence: 0.8
        },
        {
            capability: 'Deployment Automation',
            keywords: ['deployment', 'deploy', 'ci/cd', 'pipelines', 'docker', 'kubernetes', 'jenkins', 'devops', 'terraform', 'aws', 'gcp'],
            confidence: 0.85
        },
        {
            capability: 'Frontend Development',
            keywords: ['react', 'vue', 'angular', 'next.js', 'frontend', 'front-end', 'ui', 'ux', 'html', 'css', 'responsive', 'interface'],
            confidence: 0.8
        },
        {
            capability: 'Database Design',
            keywords: ['database', 'schema', 'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'nosql', 'query optimization'],
            confidence: 0.75
        },
        {
            capability: 'Browser Automation',
            keywords: ['chrome extension', 'manifest.json', 'autofill', 'scraping', 'puppeteer', 'selenium', 'browser extension'],
            confidence: 0.9
        },
        {
            capability: 'AI Applications',
            keywords: ['openai', 'whisper', 'llm', 'speech recognition', 'text-to-speech', 'tts', 'generative ai', 'ai assistant'],
            confidence: 0.85
        },
        {
            capability: 'Cloud Infrastructure',
            keywords: ['aws', 'cloud', 'gcp', 'azure', 'infrastructure', 'serverless', 'lambda'],
            confidence: 0.8
        }
    ];

    const lowerText = allText.toLowerCase();
    const evidence = [];

    capRules.forEach(rule => {
        const matched = rule.keywords.filter(kw => lowerText.includes(kw));
        if (matched.length > 0) {
            // Title match boosts confidence
            const isTitleMatch = rule.keywords.some(kw => title.toLowerCase().includes(kw));
            const confidence = isTitleMatch ? 0.95 : Math.min(rule.confidence + (matched.length * 0.05), 0.95);
            
            inferredCapabilities.push(rule.capability);
            evidence.push({
                source: `Experience: ${title} at ${company}`,
                value: `Capability: ${rule.capability} detected via terms: ${matched.join(', ')}`,
                confidence
            });
        }
    });

    return {
        company,
        title,
        durationMonths,
        technologies,
        responsibilities,
        inferredCapabilities: [...new Set(inferredCapabilities)],
        seniorityLevel,
        confidence: 0.9,
        evidence
    };
}

/**
 * Analyzes and normalizes a single certification
 */
function analyzeCertification(certName) {
    if (!certName || typeof certName !== 'string') {
        return {
            certification: 'Unknown Certification',
            issuer: 'Unknown',
            technologies: [],
            domains: [],
            relevanceTags: [],
            confidence: 0.4
        };
    }

    let issuer = 'Unknown';
    const technologies = [];
    const domains = [];
    const relevanceTags = [];
    let confidence = 0.8;

    const lower = certName.toLowerCase();

    if (lower.includes('aws') || lower.includes('amazon')) {
        issuer = 'Amazon Web Services';
        technologies.push('AWS');
        domains.push('Cloud Architecture', 'Infrastructure');
        relevanceTags.push('Cloud', 'AWS');
        confidence = 0.95;
    } else if (lower.includes('google') && lower.includes('analytics')) {
        issuer = 'Google';
        technologies.push('SQL');
        domains.push('Data Analysis', 'Reporting');
        relevanceTags.push('Data', 'Analytics');
        confidence = 0.9;
    } else if (lower.includes('kubernetes') || lower.includes('cka') || lower.includes('ckad')) {
        issuer = 'Cloud Native Computing Foundation';
        technologies.push('Kubernetes', 'Docker');
        domains.push('Containerization', 'DevOps');
        relevanceTags.push('DevOps', 'Kubernetes');
        confidence = 0.95;
    } else if (lower.includes('scrum') || lower.includes('csm')) {
        issuer = 'Scrum Alliance';
        domains.push('Agile Project Management');
        relevanceTags.push('Agile', 'Scrum');
        confidence = 0.9;
    } else {
        // Fallback guess
        if (lower.includes('google')) issuer = 'Google';
        else if (lower.includes('microsoft')) issuer = 'Microsoft';
        else if (lower.includes('oracle')) issuer = 'Oracle';
        
        domains.push('Software Engineering');
        relevanceTags.push('Technical');
    }

    return {
        certification: certName,
        issuer,
        technologies,
        domains,
        relevanceTags,
        confidence
    };
}

/**
 * Analyzes and structures education records
 */
function analyzeEducation(edu) {
    const degree = edu.degree || 'Bachelor of Science';
    const institution = edu.institution || 'University';
    const graduationYear = edu.graduation || 'N/A';
    
    let specialization = 'N/A';
    const domains = [];

    // Infer domains
    const lower = degree.toLowerCase();
    if (lower.includes('computer science') || lower.includes('cs') || lower.includes('software')) {
        specialization = 'Computer Science';
        domains.push('Software Engineering');
    } else if (lower.includes('information technology') || lower.includes('it') || lower.includes('web')) {
        specialization = 'Information Technology';
        domains.push('Web Development');
    } else if (lower.includes('data science') || lower.includes('analytics') || lower.includes('statistics')) {
        specialization = 'Data Science';
        domains.push('Analytics');
    } else if (lower.includes('computer engineering') || lower.includes('ece')) {
        specialization = 'Computer Engineering';
        domains.push('Systems Programming');
    } else {
        specialization = degree;
        domains.push('General Education');
    }

    return {
        institution,
        degree,
        specialization,
        domains,
        graduationYear
    };
}

/**
 * Builds the career knowledge graph & maturity levels
 */
function buildCapabilities(experiences, certifications) {
    const capsMap = new Map();

    experiences.forEach(exp => {
        exp.inferredCapabilities.forEach(capName => {
            if (!capsMap.has(capName)) {
                capsMap.set(capName, {
                    capability: capName,
                    experiences: [],
                    certifications: [],
                    experienceMonths: 0,
                    technologies: new Set()
                });
            }

            const data = capsMap.get(capName);
            data.experiences.push(`${exp.title} at ${exp.company}`);
            data.experienceMonths += exp.durationMonths;
            exp.technologies.forEach(t => data.technologies.add(t));
        });
    });

    certifications.forEach(cert => {
        cert.domains.forEach(domain => {
            // Check if certification domain maps to any capability
            let mappedCap = null;
            if (domain.includes('Cloud') || domain.includes('Infrastructure')) mappedCap = 'Cloud Infrastructure';
            else if (domain.includes('DevOps') || domain.includes('Containerization')) mappedCap = 'Deployment Automation';
            else if (domain.includes('Analytics') || domain.includes('Data')) mappedCap = 'Database Design';
            
            if (mappedCap) {
                if (!capsMap.has(mappedCap)) {
                    capsMap.set(mappedCap, {
                        capability: mappedCap,
                        experiences: [],
                        certifications: [],
                        experienceMonths: 0,
                        technologies: new Set()
                    });
                }
                const data = capsMap.get(mappedCap);
                data.certifications.push(cert.certification);
                cert.technologies.forEach(t => data.technologies.add(t));
            }
        });
    });

    // Map list to maturity and confidence
    const output = [];
    capsMap.forEach((data, capName) => {
        const repoCount = 0; // Filled later in orchestrator when merging with GitHub RIE
        const certCount = data.certifications.length;
        const experienceMonths = data.experienceMonths;

        // Base confidence
        let confidence = Math.min(0.5 + (experienceMonths / 24) * 0.4 + (certCount * 0.1), 0.95);

        // Determine maturity
        let maturity = 'basic';
        if (experienceMonths > 24 || certCount >= 2) {
            maturity = 'expert';
        } else if (experienceMonths > 12 || certCount >= 1) {
            maturity = 'advanced';
        } else if (experienceMonths > 6) {
            maturity = 'intermediate';
        }

        output.push({
            capability: capName,
            confidence,
            maturity,
            evidence: {
                experiences: data.experiences,
                certifications: data.certifications,
                durationMonths: experienceMonths,
                technologies: Array.from(data.technologies)
            }
        });
    });

    return output;
}

/**
 * Builds Career DNA (dominant & secondary domains) from capabilities
 */
function buildCareerDNA(capabilities) {
    const dnaScores = {
        'Full Stack Development': 0,
        'AI Applications': 0,
        'Browser Automation': 0,
        'Cloud Infrastructure': 0
    };

    // Calculate score for each DNA domain based on maturity of component capabilities
    const getMaturityMultiplier = (maturity) => {
        if (maturity === 'expert') return 1.0;
        if (maturity === 'advanced') return 0.8;
        if (maturity === 'intermediate') return 0.6;
        return 0.3;
    };

    capabilities.forEach(cap => {
        const mult = getMaturityMultiplier(cap.maturity);
        const score = cap.confidence * mult;

        if (cap.capability === 'REST API Development' || cap.capability === 'Frontend Development') {
            dnaScores['Full Stack Development'] += score * 0.5;
        }
        if (cap.capability === 'AI Applications') {
            dnaScores['AI Applications'] += score;
        }
        if (cap.capability === 'Browser Automation') {
            dnaScores['Browser Automation'] += score;
        }
        if (cap.capability === 'Cloud Infrastructure' || cap.capability === 'Deployment Automation') {
            dnaScores['Cloud Infrastructure'] += score * 0.5;
        }
    });

    const dominantDomains = [];
    const secondaryDomains = [];
    let confSum = 0;

    Object.entries(dnaScores).forEach(([domain, score]) => {
        const finalScore = Math.min(score, 1.0);
        if (finalScore >= 0.60) {
            dominantDomains.push(domain);
            confSum += finalScore;
        } else if (finalScore >= 0.30) {
            secondaryDomains.push(domain);
        }
    });

    const confidence = dominantDomains.length > 0 ? Math.round((confSum / dominantDomains.length) * 100) / 100 : 0.4;

    return {
        dominantDomains,
        secondaryDomains,
        confidence
    };
}

module.exports = {
    analyzeProfessionalProfile,
    calculateDurationInMonths // Exported for testing
};
