/**
 * Resume Vault Routes
 * 
 * API endpoints for resume history management
 */

const express = require('express');
const router = express.Router();
const {
    saveResume,
    getAllResumes,
    getResumeById,
    deleteResume,
    searchResumes,
    getVaultStats
} = require('../services/resumeVaultService');
const { generateResumePDF } = require('../services/pdfExportService');

/**
 * POST /api/save-resume
 * Save a resume to vault
 */
router.post('/save-resume', async (req, res) => {
    try {
        const { jobTitle, company, githubUsername, resumeJSON, tailoringBlueprint, jobDescription, justificationReport } = req.body;

        const savedResume = await saveResume({
            jobTitle,
            company,
            githubUsername,
            resumeJSON,
            tailoringBlueprint,
            jobDescription,
            justificationReport
        });

        res.json({
            success: true,
            resume: savedResume,
            message: 'Resume saved to vault successfully'
        });
    } catch (error) {
        console.error('Error saving resume:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/resumes
 * Get all resumes
 */
router.get('/resumes', async (req, res) => {
    try {
        const { limit, skip, sortBy } = req.query;

        const resumes = await getAllResumes({
            limit: parseInt(limit) || 50,
            skip: parseInt(skip) || 0,
            sortBy: sortBy || '-createdAt'
        });

        res.json({
            success: true,
            resumes,
            count: resumes.length
        });
    } catch (error) {
        console.error('Error fetching resumes:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/resume/:id
 * Get a single resume by ID
 */
router.get('/resume/:id', async (req, res) => {
    try {
        const resume = await getResumeById(req.params.id);

        res.json({
            success: true,
            resume
        });
    } catch (error) {
        console.error('Error fetching resume:', error);
        res.status(404).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/resume/:id/pdf
 * Download resume as PDF
 */
router.get('/resume/:id/pdf', async (req, res) => {
    try {
        const resume = await getResumeById(req.params.id);

        // Generate PDF
        const pdfBuffer = await generateResumePDF(resume.resumeJSON);

        // Set headers for PDF download
        const filename = `${resume.jobTitle.replace(/\s+/g, '_')}_${resume.company.replace(/\s+/g, '_')}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);

        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/resume/:id
 * Delete a resume
 */
router.delete('/resume/:id', async (req, res) => {
    try {
        const deleted = await deleteResume(req.params.id);

        res.json({
            success: true,
            message: 'Resume deleted successfully',
            resume: deleted
        });
    } catch (error) {
        console.error('Error deleting resume:', error);
        res.status(404).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/resumes/search?q=query
 * Search resumes
 */
router.get('/resumes/search', async (req, res) => {
    try {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({
                success: false,
                error: 'Search query parameter "q" is required'
            });
        }

        const resumes = await searchResumes(q);

        res.json({
            success: true,
            resumes,
            count: resumes.length
        });
    } catch (error) {
        console.error('Error searching resumes:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/vault/stats
 * Get vault statistics
 */
router.get('/vault/stats', async (req, res) => {
    try {
        const stats = await getVaultStats();

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
