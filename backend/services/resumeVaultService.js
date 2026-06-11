/**
 * Resume Vault Service
 * 
 * Handles resume storage and retrieval from MongoDB with local JSON database fallback
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Resume = require('../models/Resume');

const dbFilePath = path.join(__dirname, '..', 'resumes_db.json');

// Helper to read local database file
function readLocalDB() {
    try {
        if (!fs.existsSync(dbFilePath)) {
            return [];
        }
        const data = fs.readFileSync(dbFilePath, 'utf8');
        return JSON.parse(data || '[]');
    } catch (error) {
        console.error('Error reading local JSON DB:', error);
        return [];
    }
}

// Helper to write local database file
function writeLocalDB(data) {
    try {
        fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error('Error writing local JSON DB:', error);
    }
}

/**
 * Save a resume to the vault
 * @param {Object} data - Resume data
 * @returns {Promise<Object>} Saved resume document
 */
async function saveResume(data) {
    const { jobTitle, company, githubUsername, resumeJSON, tailoringBlueprint, jobDescription } = data;

    // Validation
    if (!jobTitle || !resumeJSON || !tailoringBlueprint) {
        throw new Error('Missing required fields: jobTitle, resumeJSON, tailoringBlueprint');
    }

    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
        const resume = new Resume({
            jobTitle,
            company: company || 'Unknown',
            githubUsername,
            resumeJSON,
            tailoringBlueprint,
            jobDescription
        });
        return await resume.save();
    } else {
        console.log('⚠️ MongoDB not connected. Saving resume to local JSON database...');
        const localDB = readLocalDB();
        const newResume = {
            _id: 'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11),
            jobTitle,
            company: company || 'Unknown',
            githubUsername,
            resumeJSON,
            tailoringBlueprint,
            jobDescription,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        localDB.push(newResume);
        writeLocalDB(localDB);
        return newResume;
    }
}

/**
 * Get all resumes from vault
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of resumes
 */
async function getAllResumes(options = {}) {
    const { limit = 50, skip = 0, sortBy = '-createdAt' } = options;

    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
        return await Resume.find()
            .sort(sortBy)
            .limit(limit)
            .skip(skip)
            .select('-__v')
            .lean();
    } else {
        console.log('⚠️ MongoDB not connected. Fetching resumes from local JSON database...');
        let localDB = readLocalDB();
        
        // Sorting
        const sortField = sortBy.startsWith('-') ? sortBy.substring(1) : sortBy;
        const sortOrder = sortBy.startsWith('-') ? -1 : 1;
        
        localDB.sort((a, b) => {
            const valA = a[sortField] || '';
            const valB = b[sortField] || '';
            if (valA < valB) return -1 * sortOrder;
            if (valA > valB) return 1 * sortOrder;
            return 0;
        });

        // Pagination
        return localDB.slice(skip, skip + limit);
    }
}

/**
 * Get a single resume by ID
 * @param {string} id - Resume ID
 * @returns {Promise<Object>} Resume document
 */
async function getResumeById(id) {
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
        const resume = await Resume.findById(id).select('-__v').lean();
        if (!resume) {
            throw new Error('Resume not found');
        }
        return resume;
    } else {
        console.log('⚠️ MongoDB not connected. Fetching resume by ID from local JSON database...');
        const localDB = readLocalDB();
        const resume = localDB.find(item => item._id === id);
        if (!resume) {
            throw new Error('Resume not found');
        }
        return resume;
    }
}

/**
 * Delete a resume by ID
 * @param {string} id - Resume ID
 * @returns {Promise<Object>} Deleted resume
 */
async function deleteResume(id) {
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
        const resume = await Resume.findByIdAndDelete(id);
        if (!resume) {
            throw new Error('Resume not found');
        }
        return resume;
    } else {
        console.log('⚠️ MongoDB not connected. Deleting resume from local JSON database...');
        let localDB = readLocalDB();
        const index = localDB.findIndex(item => item._id === id);
        if (index === -1) {
            throw new Error('Resume not found');
        }
        const [deleted] = localDB.splice(index, 1);
        writeLocalDB(localDB);
        return deleted;
    }
}

/**
 * Search resumes by company or job title
 * @param {string} query - Search query
 * @returns {Promise<Array>} Matching resumes
 */
async function searchResumes(query) {
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
        return await Resume.find({
            $or: [
                { jobTitle: { $regex: query, $options: 'i' } },
                { company: { $regex: query, $options: 'i' } }
            ]
        })
            .sort('-createdAt')
            .select('-__v')
            .lean();
    } else {
        console.log('⚠️ MongoDB not connected. Searching local JSON database...');
        const localDB = readLocalDB();
        const regex = new RegExp(query, 'i');
        const results = localDB.filter(item => 
            regex.test(item.jobTitle) || regex.test(item.company)
        );
        results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return results;
    }
}

/**
 * Get resume statistics
 * @returns {Promise<Object>} Statistics
 */
async function getVaultStats() {
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
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
    } else {
        console.log('⚠️ MongoDB not connected. Getting stats from local JSON database...');
        const localDB = readLocalDB();
        const totalResumes = localDB.length;
        
        const sorted = [...localDB].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const recentResumes = sorted.slice(0, 5).map(item => ({
            jobTitle: item.jobTitle,
            company: item.company,
            createdAt: item.createdAt
        }));

        const companyCounts = {};
        localDB.forEach(item => {
            const co = item.company || 'Unknown';
            companyCounts[co] = (companyCounts[co] || 0) + 1;
        });

        const topCompanies = Object.entries(companyCounts)
            .map(([company, count]) => ({ company, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return {
            totalResumes,
            recentResumes,
            topCompanies
        };
    }
}

module.exports = {
    saveResume,
    getAllResumes,
    getResumeById,
    deleteResume,
    searchResumes,
    getVaultStats
};
