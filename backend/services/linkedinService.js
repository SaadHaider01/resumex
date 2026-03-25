/**
 * LinkedIn Profile Aggregation Service
 * 
 * Fetches public LinkedIn data and normalizes it into a structured profile
 * using the Proxycurl API (bypasses LinkedIn scraping blocks).
 */

// In-memory cache to avoid excessive API calls
const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour (Proxycurl calls cost money)

/**
 * Main function to fetch and normalize LinkedIn profile
 * @param {string} linkedinUrl - Full LinkedIn Profile URL
 * @returns {Promise<object>} Normalized profile data matching mockData structure
 */
async function fetchLinkedInProfile(linkedinUrl) {
    if (!linkedinUrl || typeof linkedinUrl !== 'string') {
        throw new Error('LinkedIn URL is required');
    }

    const apiKey = process.env.PROXYCURL_API_KEY;
    
    // If no API key is set, we return null to trigger the fallback to mockData
    if (!apiKey) {
        console.log('⚠️ PROXYCURL_API_KEY not found in .env. Skipping LinkedIn scrape.');
        return null;
    }

    // Check cache first
    const cached = getFromCache(linkedinUrl);
    if (cached) {
        console.log(`📦 Cache hit for LinkedIn: ${linkedinUrl}`);
        return cached;
    }

    try {
        console.log(`🔍 Fetching LinkedIn profile via Proxycurl: ${linkedinUrl}`);

        const response = await fetch(`https://nubela.co/proxycurl/api/v2/linkedin?url=${encodeURIComponent(linkedinUrl)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Proxycurl returned status ${response.status}: ${errorText}`);
        }

        const rawData = await response.json();

        // Normalize the data matching the expected resume structure
        const normalizedProfile = normalizeLinkedInData(rawData);

        // Cache the result
        setCache(linkedinUrl, normalizedProfile);

        return normalizedProfile;

    } catch (error) {
        console.warn(`⚠️ Failed to fetch LinkedIn profile: ${error.message}`);
        // Return null so the pipeline falls back gracefully
        return null; 
    }
}

/**
 * Normalize Proxycurl data into the profile schema
 */
function normalizeLinkedInData(data) {
    // Map experiences
    const experience = (data.experiences || []).map(exp => ({
        company: exp.company || 'Unknown Company',
        position: exp.title || 'Unknown Position',
        duration: formatDuration(exp.starts_at, exp.ends_at),
        location: exp.location || 'Remote',
        achievements: exp.description 
            ? exp.description.split('\n').map(item => item.trim()).filter(Boolean)
            : []
    }));

    // Map education
    const education = (data.education || []).map(edu => ({
        degree: edu.degree_name ? `${edu.degree_name} in ${edu.field_of_study || 'N/A'}` : 'N/A',
        institution: edu.school || 'Unknown Institution',
        graduation: (edu.ends_at && edu.ends_at.year) ? edu.ends_at.year.toString() : 'Present',
        gpa: null // Proxycurl rarely returns GPA perfectly
    }));

    const certifications = (data.certifications || []).map(cert => cert.name);

    return {
        personalInfo: {
            name: data.full_name || '',
            email: '', // Usually not exposed publicly
            phone: '', 
            location: `${data.city || ''}, ${data.state || ''}, ${data.country_full_name || ''}`.replace(/^, | ,$|(, )+/g, ', ').trim(),
            linkedin: data.public_identifier ? `linkedin.com/in/${data.public_identifier}` : '',
            github: '' // Keep empty to merge with githubService later
        },
        summary: data.summary || data.headline || '',
        experience,
        education,
        certifications,
        // Optional raw proxycurl skills if available
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
