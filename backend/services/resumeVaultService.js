/**
 * Resume Vault Service
 * 
 * Handles resume storage and retrieval from MongoDB
 */

const Resume = require('../models/Resume');

/**
 * Save a resume to the vault
 * @param {Object} data - Resume data
 * @returns {Promise<Object>} Saved resume document
 */
async function saveResume(data) {
    const { jobTitle, company, githubUsername, resumeJSON, tailoringBlueprint, jobDescription } = data;

    // Validation
    if (!jobTitle || !company || !resumeJSON || !tailoringBlueprint) {
        throw new Error('Missing required fields: jobTitle, company, resumeJSON, tailoringBlueprint');
    }

    const resume = new Resume({
        jobTitle,
        company,
        githubUsername,
        resumeJSON,
        tailoringBlueprint,
        jobDescription
    });

    return await resume.save();
}

/**
 * Get all resumes from vault
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of resumes
 */
async function getAllResumes(options = {}) {
    const { limit = 50, skip = 0, sortBy = '-createdAt' } = options;

    return await Resume.find()
        .sort(sortBy)
        .limit(limit)
        .skip(skip)
        .select('-__v')
        .lean();
}

/**
 * Get a single resume by ID
 * @param {string} id - Resume ID
 * @returns {Promise<Object>} Resume document
 */
async function getResumeById(id) {
    const resume = await Resume.findById(id).select('-__v').lean();

    if (!resume) {
        throw new Error('Resume not found');
    }

    return resume;
}

/**
 * Delete a resume by ID
 * @param {string} id - Resume ID
 * @returns {Promise<Object>} Deleted resume
 */
async function deleteResume(id) {
    const resume = await Resume.findByIdAndDelete(id);

    if (!resume) {
        throw new Error('Resume not found');
    }

    return resume;
}

/**
 * Search resumes by company or job title
 * @param {string} query - Search query
 * @returns {Promise<Array>} Matching resumes
 */
async function searchResumes(query) {
    return await Resume.find({
        $or: [
            { jobTitle: { $regex: query, $options: 'i' } },
            { company: { $regex: query, $options: 'i' } }
        ]
    })
        .sort('-createdAt')
        .select('-__v')
        .lean();
}

/**
 * Get resume statistics
 * @returns {Promise<Object>} Statistics
 */
async function getVaultStats() {
    const totalResumes = await Resume.countDocuments();
    const recentResumes = await Resume.find()
        .sort('-createdAt')
        .limit(5)
        .select('jobTitle company createdAt')
        .lean();

    const companiesAggregation = await Resume.aggregate([
        { $group: { _id: '$company', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
    ]);

    return {
        totalResumes,
        recentResumes,
        topCompanies: companiesAggregation.map(item => ({
            company: item._id,
            count: item.count
        }))
    };
}

module.exports = {
    saveResume,
    getAllResumes,
    getResumeById,
    deleteResume,
    searchResumes,
    getVaultStats
};
