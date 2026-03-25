/**
 * Resume Model - MongoDB Schema
 */

const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
    jobTitle: {
        type: String,
        required: true,
        trim: true
    },
    company: {
        type: String,
        required: true,
        trim: true
    },
    githubUsername: {
        type: String,
        trim: true
    },
    resumeJSON: {
        type: Object,
        required: true
    },
    tailoringBlueprint: {
        type: Object,
        required: true
    },
    jobDescription: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Add index for faster queries
resumeSchema.index({ createdAt: -1 });
resumeSchema.index({ company: 1, jobTitle: 1 });

module.exports = mongoose.model('Resume', resumeSchema);
