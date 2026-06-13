/**
 * Repository Intelligence Engine (RIE)
 * 
 * Automatically profiles GitHub repositories by analyzing their file structures,
 * dependency graphs, and documentation. Traceable evidence is mapped deterministically.
 */

const fs = require('fs');
const path = require('path');

// Cache to prevent duplicate HTTP requests within a session
const fileCache = new Map();

/**
 * Main profiling entry point
 * @param {Object} data - Input object containing githubUsername and repositories
 * @returns {Promise<Object>} Output object containing analyzedRepositories
 */
async function analyzeRepositories(data) {
    const { githubUsername, repositories } = data;
    if (!githubUsername || !Array.isArray(repositories)) {
        throw new Error('Invalid input: githubUsername (string) and repositories (array) are required');
    }

    console.log(`🧠 RIE: Starting repository intelligence profiling for user: ${githubUsername}`);

    const profiles = await Promise.all(repositories.map(async (repo) => {
        try {
            return await profileRepository(githubUsername, repo);
        } catch (err) {
            console.error(`⚠️ RIE: Failed to profile repository ${repo.name}:`, err.message);
            return getBaselineProfile(repo, err.message);
        }
    }));

    return {
        analyzedRepositories: profiles
    };
}

/**
 * Capability Detection Rules (Evidence-Driven)
 */
const CAPABILITY_RULES = [
    {
        capability: 'Chrome Extension',
        rule: (tree, files, deps) => {
            const sources = [];
            const types = [];
            let confidence = 0;

            if (tree.some(p => p.endsWith('manifest.json'))) {
                sources.push('manifest.json');
                types.push('directory');
                confidence += 0.6;
            }
            if (tree.some(p => p.endsWith('background.js'))) {
                sources.push('background.js');
                types.push('source_file');
                confidence += 0.2;
            }
            if (tree.some(p => p.endsWith('contentScript.js'))) {
                sources.push('contentScript.js');
                types.push('source_file');
                confidence += 0.2;
            }
            if (tree.some(p => p.includes('extension/'))) {
                sources.push('extension/ folder');
                types.push('directory');
                confidence += 0.1;
            }
            if (files['README.md'] && /chrome\s+extension|browser\s+extension/i.test(files['README.md'])) {
                sources.push('README.md');
                types.push('documentation');
                confidence += 0.15;
            }

            return confidence >= 0.4 ? {
                capability: 'Chrome Extension',
                confidence: Math.min(confidence, 1.0),
                evidenceSources: sources,
                evidenceType: types
            } : null;
        }
    },
    {
        capability: 'PDF Generation',
        rule: (tree, files, deps) => {
            const sources = [];
            const types = [];
            let confidence = 0;

            if (deps.has('pdfkit') || deps.has('pdf-lib') || deps.has('jspdf')) {
                const dep = ['pdfkit', 'pdf-lib', 'jspdf'].find(d => deps.has(d));
                sources.push(`${dep} dependency`);
                types.push('dependency');
                confidence += 0.8;
            }
            if (files['README.md'] && /pdf\s+generation|pdfkit|generate\s+pdf/i.test(files['README.md'])) {
                sources.push('README.md');
                types.push('documentation');
                confidence += 0.2;
            }

            return confidence >= 0.4 ? {
                capability: 'PDF Generation',
                confidence: Math.min(confidence, 1.0),
                evidenceSources: sources,
                evidenceType: types
            } : null;
        }
    },
    {
        capability: 'REST APIs',
        rule: (tree, files, deps) => {
            const sources = [];
            const types = [];
            let confidence = 0;

            const webDeps = ['express', 'fastapi', 'flask', 'django', 'spring', 'nest'];
            const foundDep = webDeps.find(d => deps.has(d));
            if (foundDep) {
                sources.push(`${foundDep} dependency`);
                types.push('dependency');
                confidence += 0.5;
            }
            if (tree.some(p => p.includes('routes/') || p.includes('controllers/') || p.includes('backend/'))) {
                sources.push('API directory structure (backend/routes/controllers)');
                types.push('directory');
                confidence += 0.3;
            }
            if (tree.some(p => p.endsWith('server.js') || p.endsWith('app.js') || p.endsWith('main.py'))) {
                sources.push('Server entrypoint file');
                types.push('source_file');
                confidence += 0.1;
            }
            if (files['README.md'] && /api|rest\s+api|endpoints/i.test(files['README.md'])) {
                sources.push('README.md');
                types.push('documentation');
                confidence += 0.1;
            }

            return confidence >= 0.4 ? {
                capability: 'REST APIs',
                confidence: Math.min(confidence, 1.0),
                evidenceSources: sources,
                evidenceType: types
            } : null;
        }
    },
    {
        capability: 'Form Autofill',
        rule: (tree, files, deps) => {
            const sources = [];
            const types = [];
            let confidence = 0;

            const autofillFiles = tree.filter(p => p.toLowerCase().includes('autofill') || p.toLowerCase().includes('formdetector'));
            if (autofillFiles.length > 0) {
                sources.push(...autofillFiles.slice(0, 2));
                types.push('source_file');
                confidence += 0.8;
            }
            if (files['README.md'] && /autofill|auto-fill|form\s+detector|fill\s+form/i.test(files['README.md'])) {
                sources.push('README.md');
                types.push('documentation');
                confidence += 0.2;
            }

            return confidence >= 0.4 ? {
                capability: 'Form Autofill',
                confidence: Math.min(confidence, 1.0),
                evidenceSources: sources,
                evidenceType: types
            } : null;
        }
    },
    {
        capability: 'LinkedIn Scraping',
        rule: (tree, files, deps) => {
            const sources = [];
            const types = [];
            let confidence = 0;

            const scraperFiles = tree.filter(p => p.toLowerCase().includes('linkedinscraper') || p.toLowerCase().includes('linkedinservice'));
            if (scraperFiles.length > 0) {
                sources.push(...scraperFiles.slice(0, 2));
                types.push('source_file');
                confidence += 0.8;
            }
            if (files['README.md'] && /linkedin\s+scraping|linkedin\s+scraper|scrape\s+linkedin/i.test(files['README.md'])) {
                sources.push('README.md');
                types.push('documentation');
                confidence += 0.2;
            }

            return confidence >= 0.4 ? {
                capability: 'LinkedIn Scraping',
                confidence: Math.min(confidence, 1.0),
                evidenceSources: sources,
                evidenceType: types
            } : null;
        }
    },
    {
        capability: 'Python',
        rule: (tree, files, deps) => {
            const sources = [];
            const types = [];
            let confidence = 0;

            if (tree.some(p => p.endsWith('requirements.txt') || p.endsWith('pyproject.toml') || p.endsWith('Pipfile'))) {
                sources.push('Python dependency config');
                types.push('directory');
                confidence += 0.6;
            }
            if (tree.some(p => p.endsWith('.py'))) {
                sources.push('Python source files (.py)');
                types.push('source_file');
                confidence += 0.3;
            }
            if (files['README.md'] && /python/i.test(files['README.md'])) {
                sources.push('README.md');
                types.push('documentation');
                confidence += 0.1;
            }

            return confidence >= 0.4 ? {
                capability: 'Python',
                confidence: Math.min(confidence, 1.0),
                evidenceSources: sources,
                evidenceType: types
            } : null;
        }
    },
    {
        capability: 'Whisper',
        rule: (tree, files, deps) => {
            const sources = [];
            const types = [];
            let confidence = 0;

            if (deps.has('whisper') || deps.has('openai-whisper')) {
                sources.push('whisper dependency');
                types.push('dependency');
                confidence += 0.8;
            }
            if (files['README.md'] && /whisper/i.test(files['README.md'])) {
                sources.push('README.md');
                types.push('documentation');
                confidence += 0.2;
            }

            return confidence >= 0.4 ? {
                capability: 'Whisper',
                confidence: Math.min(confidence, 1.0),
                evidenceSources: sources,
                evidenceType: types
            } : null;
        }
    },
    {
        capability: 'Speech Recognition',
        rule: (tree, files, deps) => {
            const sources = [];
            const types = [];
            let confidence = 0;

            if (deps.has('whisper') || deps.has('openai-whisper') || deps.has('speechrecognition') || deps.has('speech_recognition')) {
                sources.push('Speech recognition library dependency');
                types.push('dependency');
                confidence += 0.8;
            }
            if (files['README.md'] && /speech\s+recognition|speech-to-text|stt/i.test(files['README.md'])) {
                sources.push('README.md');
                types.push('documentation');
                confidence += 0.2;
            }

            return confidence >= 0.4 ? {
                capability: 'Speech Recognition',
                confidence: Math.min(confidence, 1.0),
                evidenceSources: sources,
                evidenceType: types
            } : null;
        }
    },
    {
        capability: 'Text To Speech',
        rule: (tree, files, deps) => {
            const sources = [];
            const types = [];
            let confidence = 0;

            if (deps.has('edge-tts') || deps.has('gtts') || deps.has('pyttsx3')) {
                sources.push('Text-to-speech library dependency');
                types.push('dependency');
                confidence += 0.8;
            }
            if (files['README.md'] && /text\s+to\s+speech|tts|edge-tts/i.test(files['README.md'])) {
                sources.push('README.md');
                types.push('documentation');
                confidence += 0.2;
            }

            return confidence >= 0.4 ? {
                capability: 'Text To Speech',
                confidence: Math.min(confidence, 1.0),
                evidenceSources: sources,
                evidenceType: types
            } : null;
        }
    },
    {
        capability: 'AI Assistant',
        rule: (tree, files, deps) => {
            const sources = [];
            const types = [];
            let confidence = 0;

            if (deps.has('openai') || deps.has('@google/generative-ai') || deps.has('transformers')) {
                sources.push('Generative AI SDK dependency');
                types.push('dependency');
                confidence += 0.7;
            }
            if (files['README.md'] && /ai\s+assistant|voice\s+assistant|assistant|gpt|gemini/i.test(files['README.md'])) {
                sources.push('README.md');
                types.push('documentation');
                confidence += 0.3;
            }

            return confidence >= 0.4 ? {
                capability: 'AI Assistant',
                confidence: Math.min(confidence, 1.0),
                evidenceSources: sources,
                evidenceType: types
            } : null;
        }
    },
    {
        capability: 'JavaScript',
        rule: (tree, files, deps) => {
            const sources = [];
            const types = [];
            let confidence = 0;

            if (tree.some(p => p.endsWith('package.json') || p.endsWith('tsconfig.json'))) {
                sources.push('Node.js / TypeScript configuration');
                types.push('directory');
                confidence += 0.6;
            }
            if (tree.some(p => p.endsWith('.js') || p.endsWith('.ts') || p.endsWith('.jsx') || p.endsWith('.tsx'))) {
                sources.push('JavaScript/TypeScript source files');
                types.push('source_file');
                confidence += 0.3;
            }
            if (files['README.md'] && /javascript|typescript|node\.js|js|ts/i.test(files['README.md'])) {
                sources.push('README.md');
                types.push('documentation');
                confidence += 0.1;
            }

            return confidence >= 0.4 ? {
                capability: 'JavaScript',
                confidence: Math.min(confidence, 1.0),
                evidenceSources: sources,
                evidenceType: types
            } : null;
        }
    },
    {
        capability: 'Speech APIs',
        rule: (tree, files, deps) => {
            const sources = [];
            const types = [];
            let confidence = 0;

            if (files['README.md'] && /speech\s+api|web\s+speech|speechsynthesis|speechrecognition/i.test(files['README.md'])) {
                sources.push('README.md description of Web Speech API usage');
                types.push('documentation');
                confidence += 0.8;
            }
            if (tree.some(p => p.toLowerCase().includes('speech'))) {
                sources.push('Speech handling file names');
                types.push('source_file');
                confidence += 0.2;
            }

            return confidence >= 0.4 ? {
                capability: 'Speech APIs',
                confidence: Math.min(confidence, 1.0),
                evidenceSources: sources,
                evidenceType: types
            } : null;
        }
    },
    {
        capability: 'Language Learning',
        rule: (tree, files, deps) => {
            const sources = [];
            const types = [];
            let confidence = 0;

            if (files['README.md'] && /language\s+learning|linguavoice|language\s+acquisition/i.test(files['README.md'])) {
                sources.push('README.md');
                types.push('documentation');
                confidence += 0.8;
            }
            if (tree.some(p => p.toLowerCase().includes('lang') || p.toLowerCase().includes('lesson') || p.toLowerCase().includes('vocab'))) {
                sources.push('Language lessons/vocabulary resources');
                types.push('source_file');
                confidence += 0.2;
            }

            return confidence >= 0.4 ? {
                capability: 'Language Learning',
                confidence: Math.min(confidence, 1.0),
                evidenceSources: sources,
                evidenceType: types
            } : null;
        }
    },
    {
        capability: 'Frontend Application',
        rule: (tree, files, deps) => {
            const sources = [];
            const types = [];
            let confidence = 0;

            const frontendDeps = ['react', 'vue', 'angular', 'svelte', 'next', 'vite'];
            const foundDep = frontendDeps.find(d => deps.has(d));
            if (foundDep) {
                sources.push(`${foundDep} dependency`);
                types.push('dependency');
                confidence += 0.6;
            }
            if (tree.some(p => p.includes('src/') || p.includes('components/') || p.includes('public/'))) {
                sources.push('Frontend folder structure (src/components)');
                types.push('directory');
                confidence += 0.3;
            }
            if (files['README.md'] && /frontend|ui|user\s+interface|web\s+app/i.test(files['README.md'])) {
                sources.push('README.md');
                types.push('documentation');
                confidence += 0.1;
            }

            return confidence >= 0.4 ? {
                capability: 'Frontend Application',
                confidence: Math.min(confidence, 1.0),
                evidenceSources: sources,
                evidenceType: types
            } : null;
        }
    }
];

/**
 * Profiles a single repository by fetching config files, structure trees, and applying matching rules
 */
async function profileRepository(username, repo) {
    const repoName = repo.name || repo.repositoryName || '';
    const repoUrl = repo.url || (repoName ? `https://github.com/${username}/${repoName}` : '');

    // Target files that we look to analyze
    const filesToFetch = [
        'package.json',
        'requirements.txt',
        'manifest.json',
        'README.md',
        'Dockerfile',
        'docker-compose.yml',
        'tsconfig.json',
        'vite.config.js',
        'vite.config.ts',
        'next.config.js',
        'Cargo.toml',
        'go.mod',
        'pyproject.toml',
        'Pipfile'
    ];

    let treePaths = [];
    const fileContents = {};

    // 1. Fetch Repository Structure Tree (recursive)
    if (repo.mockTree) {
        treePaths = repo.mockTree.filter(p => typeof p === 'string' && p);
    } else if (repoName) {
        const branches = ['main', 'master'];
        for (const branch of branches) {
            const treeUrl = `https://api.github.com/repos/${username}/${repoName}/git/trees/${branch}?recursive=1`;
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000);
                const response = await fetch(treeUrl, {
                    headers: { 'User-Agent': 'ResumeX-RIE' },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                if (response.ok) {
                    const data = await response.json();
                    if (data && Array.isArray(data.tree)) {
                        treePaths = data.tree.map(item => item ? item.path : null).filter(p => typeof p === 'string' && p);
                        break;
                    }
                }
            } catch (err) {
                // Try next branch
            }
        }
    }

    // Fallback: If tree fetching failed (or was empty/rate-limited), seed from fileContents list
    if (treePaths.length === 0) {
        treePaths = filesToFetch;
    }

    // 2. Fetch File Contents
    if (repo.mockFiles) {
        Object.assign(fileContents, repo.mockFiles);
    } else if (repoName) {
        // Filter target files to only fetch files that are in the tree paths to optimize requests
        const filesToActuallyFetch = filesToFetch.filter(file => 
            treePaths.some(p => p.endsWith(file))
        );

        await Promise.all(filesToActuallyFetch.map(async (filename) => {
            // Local fallback reader for offline/local development of resumex
            if (repoName && repoName.toLowerCase() === 'resumex' && fs.existsSync(path.join(__dirname, '..', '..', filename))) {
                try {
                    const data = fs.readFileSync(path.join(__dirname, '..', '..', filename), 'utf8');
                    fileContents[filename] = data;
                    return;
                } catch (e) {
                    // fall back to network
                }
            }

            const cacheKey = `${username}/${repoName}/${filename}`;
            if (fileCache.has(cacheKey)) {
                fileContents[filename] = fileCache.get(cacheKey);
                return;
            }

            const branches = ['main', 'master'];
            for (const branch of branches) {
                const rawUrl = `https://raw.githubusercontent.com/${username}/${repoName}/${branch}/${filename}`;
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 2000);

                    const response = await fetch(rawUrl, { signal: controller.signal });
                    clearTimeout(timeoutId);

                    if (response.ok) {
                        const text = await response.text();
                        fileCache.set(cacheKey, text);
                        fileContents[filename] = text;
                        break;
                    }
                } catch (err) {
                    // Try next branch
                }
            }
        }));
    }

    // 3. Dependency Aggregation
    const dependencies = new Set();
    if (fileContents['package.json']) {
        try {
            const pkg = JSON.parse(fileContents['package.json']);
            const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
            Object.keys(deps).forEach(dep => dependencies.add(dep.toLowerCase()));
        } catch (e) {}
    }
    if (fileContents['requirements.txt']) {
        const lines = fileContents['requirements.txt'].split('\n');
        lines.forEach(line => {
            const clean = line.split('==')[0].split('>=')[0].trim().toLowerCase();
            if (clean) dependencies.add(clean);
        });
    }

    // 4. Technology extraction from metadata and parsed languages
    const technologies = new Set(repo.languages || []);
    const frameworks = new Set();
    const libraries = new Set();
    const databases = new Set();
    const cloudServices = new Set();

    // Map dependencies to structured technology categorizations
    if (dependencies.has('react')) frameworks.add('React');
    if (dependencies.has('next')) frameworks.add('Next.js');
    if (dependencies.has('express')) frameworks.add('Express');
    if (dependencies.has('flask')) frameworks.add('Flask');
    if (dependencies.has('django')) frameworks.add('Django');
    if (dependencies.has('fastapi')) frameworks.add('FastAPI');
    
    if (dependencies.has('mongoose')) {
        databases.add('MongoDB');
        libraries.add('Mongoose ORM');
    }
    if (dependencies.has('redis')) databases.add('Redis');
    if (dependencies.has('pg')) databases.add('PostgreSQL');

    if (dependencies.has('pdfkit')) libraries.add('pdfkit');
    if (dependencies.has('socket.io') || dependencies.has('socket.io-client')) libraries.add('Socket.io');
    if (dependencies.has('@google/generative-ai')) libraries.add('Gemini API');
    if (dependencies.has('openai')) libraries.add('OpenAI API');
    if (dependencies.has('transformers')) libraries.add('HuggingFace');
    if (dependencies.has('whisper') || dependencies.has('openai-whisper')) libraries.add('Whisper STT');
    if (dependencies.has('edge-tts')) libraries.add('Edge-TTS');

    // 5. Capability Detection
    const detectedCapabilities = [];
    CAPABILITY_RULES.forEach(ruleInfo => {
        const capabilityData = ruleInfo.rule(treePaths, fileContents, dependencies);
        if (capabilityData) {
            detectedCapabilities.push(capabilityData);
        }
    });

    // 6. Architecture Pattern Detection
    const architecturePatterns = [];
    const capsSet = new Set(detectedCapabilities.map(c => c.capability));

    // Chrome Extension Architecture
    if (capsSet.has('Chrome Extension')) {
        const evidence = ['manifest.json'];
        if (treePaths.some(p => p.endsWith('background.js'))) evidence.push('background.js');
        if (treePaths.some(p => p.endsWith('contentScript.js'))) evidence.push('contentScript.js');
        if (treePaths.some(p => p.includes('extension/'))) evidence.push('extension/ directory');
        architecturePatterns.push({
            pattern: 'Chrome Extension Architecture',
            confidence: 1.0,
            evidence
        });
    }

    // REST API Architecture
    if (capsSet.has('REST APIs')) {
        const evidence = [];
        const found = ['express', 'fastapi', 'flask', 'django'].find(d => dependencies.has(d));
        if (found) evidence.push(`${found} dependency`);
        if (treePaths.some(p => p.includes('routes') || p.includes('controllers'))) evidence.push('routes/controllers folders');
        architecturePatterns.push({
            pattern: 'REST API',
            confidence: 0.95,
            evidence
        });
    }

    // Client Server Architecture
    if (capsSet.has('REST APIs') && capsSet.has('Frontend Application')) {
        architecturePatterns.push({
            pattern: 'Client Server Architecture',
            confidence: 0.95,
            evidence: ['Frontend application stack (React/Vite)', 'REST API backend service']
        });
    }

    // MVC
    if (treePaths.some(p => p.includes('models/')) && treePaths.some(p => p.includes('views/')) && treePaths.some(p => p.includes('controllers/'))) {
        architecturePatterns.push({
            pattern: 'MVC',
            confidence: 0.90,
            evidence: ['models/ directory', 'views/ directory', 'controllers/ directory']
        });
    }

    // Microservices
    if (treePaths.some(p => p.endsWith('docker-compose.yml')) || treePaths.filter(p => p.includes('services/')).length > 2) {
        architecturePatterns.push({
            pattern: 'Microservices',
            confidence: 0.85,
            evidence: treePaths.some(p => p.endsWith('docker-compose.yml')) ? ['docker-compose.yml'] : ['multi-service architecture']
        });
    }

    // Authentication System
    if (dependencies.has('passport') || dependencies.has('jsonwebtoken')) {
        architecturePatterns.push({
            pattern: 'Authentication System',
            confidence: 0.90,
            evidence: [
                dependencies.has('jsonwebtoken') ? 'jsonwebtoken dependency' : null,
                dependencies.has('passport') ? 'passport dependency' : null
            ].filter(Boolean)
        });
    }

    // Real-Time Communication
    if (dependencies.has('socket.io') || dependencies.has('socket.io-client') || dependencies.has('ws') || dependencies.has('websocket')) {
        architecturePatterns.push({
            pattern: 'Real-Time Communication',
            confidence: 0.95,
            evidence: [dependencies.has('socket.io') ? 'socket.io dependency' : 'websocket library']
        });
    }

    // AI Pipeline
    if (capsSet.has('Whisper') || capsSet.has('AI Assistant')) {
        architecturePatterns.push({
            pattern: 'AI Pipeline',
            confidence: 0.95,
            evidence: [
                dependencies.has('transformers') ? 'transformers library' : null,
                dependencies.has('openai') ? 'openai SDK' : null,
                dependencies.has('@google/generative-ai') ? 'generative-ai SDK' : null
            ].filter(Boolean)
        });
    }

    // Speech Processing Pipeline
    if (capsSet.has('Speech Recognition') || capsSet.has('Text To Speech') || capsSet.has('Speech APIs')) {
        architecturePatterns.push({
            pattern: 'Speech Processing Pipeline',
            confidence: 0.98,
            evidence: [
                capsSet.has('Speech Recognition') ? 'Speech recognition engine' : null,
                capsSet.has('Text To Speech') ? 'Text-to-speech engine' : null,
                capsSet.has('Speech APIs') ? 'Web Speech API' : null
            ].filter(Boolean)
        });
    }

    // 7. Base evidence mapping
    const evidence = [];
    if (repo.stars > 0) {
        evidence.push({
            source: 'GitHub Metadata',
            value: `Project has ${repo.stars} star(s) on GitHub`,
            confidence: 1.0
        });
    }

    if (treePaths.length > 0) {
        evidence.push({
            source: 'Repository Tree Analysis',
            value: `Analyzed repository tree structure containing ${treePaths.length} paths`,
            confidence: 0.95
        });
    }

    detectedCapabilities.forEach(cap => {
        evidence.push({
            source: `Capability: ${cap.capability}`,
            value: `Verified capability with ${Math.round(cap.confidence * 100)}% confidence using evidence: ${cap.evidenceSources.join(', ')}`,
            confidence: cap.confidence
        });
    });

    architecturePatterns.forEach(arch => {
        evidence.push({
            source: `Architecture: ${arch.pattern}`,
            value: `Detected pattern with ${Math.round(arch.confidence * 100)}% confidence using: ${arch.evidence.join(', ')}`,
            confidence: arch.confidence
        });
    });

    // 8. Recruiter-Focused Summary (What can this candidate demonstrably build?)
    let recruiterSummary = '';
    if (detectedCapabilities.length > 0) {
        const capsDisplayList = detectedCapabilities.map(c => c.capability);
        recruiterSummary = `Demonstrated ability to design, build, and deploy: ${capsDisplayList.join(', ')}.`;
    } else {
        recruiterSummary = `Demonstrates software engineering proficiency and code implementation.`;
    }

    // 9. Overall Confidence Score (evidence-driven average)
    let scoreSum = 0;
    evidence.forEach(e => scoreSum += e.confidence);
    const confidenceScore = evidence.length > 0 ? Math.min(Math.round((scoreSum / evidence.length) * 100) / 100, 1.0) : 0.5;

    // Normalize category / type
    let projectType = 'Web Application';
    let projectCategory = 'Software Development';

    if (capsSet.has('Chrome Extension')) {
        projectType = 'Browser Extension';
        projectCategory = 'Browser Automation / Tools';
    } else if (capsSet.has('Whisper') || capsSet.has('Speech Recognition') || capsSet.has('AI Assistant')) {
        projectType = 'AI Voice Assistant / Speech Tool';
        projectCategory = 'Artificial Intelligence / Speech Processing';
    } else if (frameworks.has('Express') || frameworks.has('Next.js')) {
        projectType = 'Full-Stack Web Application';
        projectCategory = 'Web Development';
    }

    return {
        repositoryName: repoName,
        repositoryUrl: repoUrl,
        description: repo.description || '',
        technologies: [...technologies],
        frameworks: [...frameworks],
        libraries: [...libraries],
        databases: [...databases],
        cloudServices: [...cloudServices],
        projectType,
        projectCategory,
        detectedCapabilities, // Array of capability provenance objects
        architecturePatterns,
        confidenceScore,
        evidence,
        recruiterSummary
    };
}

/**
 * Fallback baseline profile when profiling fails
 */
function getBaselineProfile(repo, reason) {
    return {
        repositoryName: repo.name,
        repositoryUrl: repo.url || '',
        description: repo.description || '',
        technologies: repo.languages || [],
        frameworks: [],
        libraries: [],
        databases: [],
        cloudServices: [],
        projectType: 'Software Project',
        projectCategory: 'General Software Engineering',
        detectedCapabilities: [],
        architecturePatterns: [],
        confidenceScore: 0.4,
        evidence: [
            {
                source: 'Baseline Heuristic',
                value: `Baseline profiling completed due to error: ${reason}`,
                confidence: 0.4
            }
        ],
        recruiterSummary: 'Demonstrates baseline software project implementation.'
    };
}

module.exports = {
    analyzeRepositories
};
