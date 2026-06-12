const fs = require('fs');
const path = require('path');

function cleanTailoredResume(tailoredResume, originalProfile) {
    if (!tailoredResume || !originalProfile) return tailoredResume;

    const matchesAny = (value, list) => {
        if (!value || !list || list.length === 0) return false;
        const val = value.toLowerCase().trim();
        return list.some(item => {
            if (!item) return false;
            const cleanItem = item.toLowerCase().trim();
            return val.includes(cleanItem) || cleanItem.includes(val);
        });
    };

    // 1. Clean Experience
    if (!originalProfile.experience || originalProfile.experience.length === 0) {
        tailoredResume.experience = [];
    } else {
        const originalCompanies = originalProfile.experience.map(exp => exp.company).filter(Boolean);
        tailoredResume.experience = (tailoredResume.experience || []).filter(exp => 
            matchesAny(exp.company, originalCompanies)
        );
    }

    // 2. Clean Education
    if (!originalProfile.education || originalProfile.education.length === 0) {
        tailoredResume.education = [];
    } else {
        const originalInstitutions = originalProfile.education.map(edu => edu.institution).filter(Boolean);
        tailoredResume.education = (tailoredResume.education || []).filter(edu => 
            matchesAny(edu.institution, originalInstitutions)
        );
    }

    // 3. Clean Projects
    if (!originalProfile.projects || originalProfile.projects.length === 0) {
        tailoredResume.projects = [];
    } else {
        const originalProjects = originalProfile.projects.map(proj => proj.name).filter(Boolean);
        tailoredResume.projects = (tailoredResume.projects || []).filter(proj => 
            matchesAny(proj.name, originalProjects)
        );
    }

    // 4. Clean Certifications
    if (!originalProfile.certifications || originalProfile.certifications.length === 0) {
        tailoredResume.certifications = [];
    } else {
        const originalCerts = originalProfile.certifications.filter(Boolean);
        tailoredResume.certifications = (tailoredResume.certifications || []).filter(cert => 
            matchesAny(cert, originalCerts)
        );
    }

    return tailoredResume;
}

const mockProfile = require('../mockData');

// Let's load the latest entry from resumes_db.json
const dbPath = path.join(__dirname, '..', 'resumes_db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const latestResume = db[db.length - 1];

console.log("Before Clean Experience:", latestResume.resumeJSON.experience);
console.log("Before Clean Education:", latestResume.resumeJSON.education);

const cleaned = cleanTailoredResume(latestResume.resumeJSON, mockProfile);
console.log("After Clean (with mockProfile) Experience:", cleaned.experience);
console.log("After Clean (with mockProfile) Education:", cleaned.education);

const emptyProfile = {
    experience: [],
    education: [],
    projects: []
};
const cleanedEmpty = cleanTailoredResume(JSON.parse(JSON.stringify(latestResume.resumeJSON)), emptyProfile);
console.log("After Clean (with emptyProfile) Experience:", cleanedEmpty.experience);
console.log("After Clean (with emptyProfile) Education:", cleanedEmpty.education);
