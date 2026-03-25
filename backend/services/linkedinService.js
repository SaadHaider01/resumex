/**
 * LinkedIn Profile Aggregation Service
 * 
 * Fetches public LinkedIn data and normalizes it into a structured profile
 * using RapidAPI (e.g. Fresh Linkedin Profile Data) to bypass blocks.
 */

// In-memory cache to avoid excessive API calls
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Main function to fetch and normalize LinkedIn profile
 * @param {string} linkedinUrl - Full LinkedIn Profile URL
 * @returns {Promise<object>} Normalized profile data matching mockData structure
 */
async function fetchLinkedInProfile(linkedinUrl) {
    if (!linkedinUrl || typeof linkedinUrl !== 'string') {
        throw new Error('LinkedIn URL is required');
    }

    const apiKey = process.env.RAPIDAPI_KEY;
    
    if (!apiKey) {
        console.log('⚠️ RAPIDAPI_KEY not found in .env. Skipping LinkedIn scrape.');
        return null;
    }

    const cached = getFromCache(linkedinUrl);
    if (cached) {
        console.log(`📦 Cache hit for LinkedIn: ${linkedinUrl}`);
        return cached;
    }

    try {
        console.log(`🔍 Fetching LinkedIn profile via RapidAPI: ${linkedinUrl}`);

        // Using a popular generic RapidAPI endpoint for LinkedIn profiles
        const response = await fetch(`https://fresh-linkedin-profile-data.p.rapidapi.com/get-linkedin-profile?linkedin_url=${encodeURIComponent(linkedinUrl)}`, {
            method: 'GET',
            headers: {
                'x-rapidapi-key': apiKey,
                'x-rapidapi-host': 'fresh-linkedin-profile-data.p.rapidapi.com'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`RapidAPI returned status ${response.status}: ${errorText}`);
        }

        const rawData = await response.json();
        
        // Sometimes RapidAPI wrappers put data inside a "data" object
        const profileData = rawData.data || rawData;

        // Normalize the data matching the expected resume structure
        const normalizedProfile = normalizeLinkedInData(profileData, linkedinUrl);

        setCache(linkedinUrl, normalizedProfile);

        return normalizedProfile;

    } catch (error) {
        console.warn(`⚠️ Failed to fetch LinkedIn profile: ${error.message}`);
        return null; 
    }
}

/**
 * Normalize API data into the profile schema robustly
 */
function normalizeLinkedInData(data, url) {
    const rawExperiences = data.experiences || data.experience || [];
    const experience = rawExperiences.map(exp => ({
        company: exp.company || exp.company_name || 'Unknown Company',
        position: exp.title || exp.position || 'Unknown Position',
        duration: formatDuration(exp.starts_at || exp.start_date, exp.ends_at || exp.end_date),
        location: exp.location || 'Remote',
        achievements: exp.description 
            ? exp.description.split('\n').map(item => item.trim()).filter(Boolean)
            : []
    }));

    const rawEducation = data.education || data.educations || [];
    const education = rawEducation.map(edu => ({
        degree: edu.degree_name || edu.degree ? `${edu.degree_name || edu.degree} ${edu.field_of_study ? 'in ' + edu.field_of_study : ''}` : 'N/A',
        institution: edu.school || edu.school_name || 'Unknown Institution',
        graduation: (edu.ends_at && edu.ends_at.year) ? edu.ends_at.year.toString() : (edu.end_date || 'Present'),
        gpa: null
    }));

    const certifications = (data.certifications || []).map(cert => cert.name || cert.title);

    return {
        personalInfo: {
            name: data.full_name || data.name || '',
            email: '', 
            phone: '', 
            location: `${data.city || ''}, ${data.state || ''}, ${data.country_full_name || data.country || ''}`.replace(/^, | ,$|(, )+/g, ', ').trim(),
            linkedin: url,
            github: '' 
        },
        summary: data.summary || data.about || data.headline || '',
        experience,
        education,
        certifications,
        rawSkills: data.skills || []
    };
}

/**
 * Helper to format date object into "MMM YYYY - MMM YYYY"
 */
function formatDuration(start, end) {
    if (!start || !start.year) return 'Unknown - Present';
    const startStr = `${start.month ? start.month + '/' : ''}${start.year}`;
    const endStr = end && end.year ? `${end.month ? end.month + '/' : ''}${end.year}` : 'Present';
    return `${startStr} - ${endStr}`;
}

/**
 * Cache management
 */
function getFromCache(url) {
    const cached = cache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    cache.delete(url);
    return null;
}

function setCache(url, data) {
    cache.set(url, {
        data,
        timestamp: Date.now()
    });
}

module.exports = {
    fetchLinkedInProfile
};
