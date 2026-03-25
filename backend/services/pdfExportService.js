/**
 * PDF Export Service
 * 
 * Generates ATS-friendly PDF resumes from JSON
 * Uses PDFKit for clean, professional output
 */

const PDFDocument = require('pdfkit');
const { Readable } = require('stream');

/**
 * Generates a PDF resume from JSON
 * @param {Object} resume - Resume JSON object
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateResumePDF(resume) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'LETTER',
                margins: { top: 50, bottom: 50, left: 50, right: 50 }
            });

            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(buffers);
                resolve(pdfBuffer);
            });
            doc.on('error', reject);

            // Build PDF content
            buildPDFContent(doc, resume);

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Builds PDF content from resume JSON
 */
function buildPDFContent(doc, resume) {
    const { personalInfo, professionalSummary, skills, experience, education, projects, certifications } = resume;

    // HEADER - Personal Info
    if (personalInfo) {
        doc.fontSize(24)
            .font('Helvetica-Bold')
            .text(personalInfo.name || 'Resume', { align: 'center' });

        doc.moveDown(0.3);

        const contactInfo = [];
        if (personalInfo.email) contactInfo.push(personalInfo.email);
        if (personalInfo.phone) contactInfo.push(personalInfo.phone);
        if (personalInfo.location) contactInfo.push(personalInfo.location);

        doc.fontSize(10)
            .font('Helvetica')
            .text(contactInfo.join(' • '), { align: 'center' });

        if (personalInfo.linkedin || personalInfo.github) {
            const links = [];
            if (personalInfo.linkedin) links.push(personalInfo.linkedin);
            if (personalInfo.github) links.push(personalInfo.github);
            doc.text(links.join(' • '), { align: 'center' });
        }

        doc.moveDown(1);
    }

    // PROFESSIONAL SUMMARY
    if (professionalSummary) {
        addSection(doc, 'Professional Summary');
        doc.fontSize(10)
            .font('Helvetica')
            .text(professionalSummary, { align: 'justify' });
        doc.moveDown(1);
    }

    // SKILLS
    if (skills) {
        addSection(doc, 'Skills');

        const skillsList = [];
        if (skills.technical && skills.technical.length > 0) {
            skillsList.push(`Technical: ${skills.technical.join(', ')}`);
        }
        if (skills.tools && skills.tools.length > 0) {
            skillsList.push(`Tools: ${skills.tools.join(', ')}`);
        }
        if (skills.soft && skills.soft.length > 0) {
            skillsList.push(`Soft Skills: ${skills.soft.join(', ')}`);
        }

        doc.fontSize(10).font('Helvetica');
        skillsList.forEach(skillLine => {
            doc.text(skillLine);
            doc.moveDown(0.3);
        });
        doc.moveDown(0.7);
    }

    // EXPERIENCE
    if (experience && experience.length > 0) {
        addSection(doc, 'Experience');

        experience.forEach((job, index) => {
            // Company and position
            doc.fontSize(11)
                .font('Helvetica-Bold')
                .text(job.position || 'Position', { continued: true })
                .fontSize(10)
                .font('Helvetica')
                .text(` - ${job.company || 'Company'}`);

            // Duration and location
            doc.fontSize(9)
                .font('Helvetica-Oblique')
                .text(`${job.duration || ''} ${job.location ? '• ' + job.location : ''}`, { indent: 0 });

            doc.moveDown(0.3);

            // Achievements
            if (job.achievements && job.achievements.length > 0) {
                doc.fontSize(10).font('Helvetica');

                job.achievements.forEach(achievement => {
                    const bulletX = doc.x;
                    const bulletY = doc.y;

                    doc.text('•', bulletX, bulletY, { continued: true, width: 15 });
                    doc.text(achievement, bulletX + 15, bulletY, { width: doc.page.width - 100 - 15 });
                    doc.moveDown(0.2);
                });
            }

            if (index < experience.length - 1) {
                doc.moveDown(0.5);
            }
        });

        doc.moveDown(1);
    }

    // PROJECTS
    if (projects && projects.length > 0) {
        addSection(doc, 'Projects');

        projects.forEach((project, index) => {
            doc.fontSize(11)
                .font('Helvetica-Bold')
                .text(project.name || 'Project');

            if (project.technologies && project.technologies.length > 0) {
                doc.fontSize(9)
                    .font('Helvetica-Oblique')
                    .text(`Technologies: ${project.technologies.join(', ')}`);
            }

            doc.moveDown(0.3);

            if (project.description) {
                doc.fontSize(10)
                    .font('Helvetica')
                    .text(project.description);
                doc.moveDown(0.2);
            }

            if (project.highlights && project.highlights.length > 0) {
                doc.fontSize(10).font('Helvetica');

                project.highlights.forEach(highlight => {
                    const bulletX = doc.x;
                    const bulletY = doc.y;

                    doc.text('•', bulletX, bulletY, { continued: true, width: 15 });
                    doc.text(highlight, bulletX + 15, bulletY, { width: doc.page.width - 100 - 15 });
                    doc.moveDown(0.2);
                });
            }

            if (index < projects.length - 1) {
                doc.moveDown(0.5);
            }
        });

        doc.moveDown(1);
    }

    // EDUCATION
    if (education && education.length > 0) {
        addSection(doc, 'Education');

        education.forEach((edu, index) => {
            doc.fontSize(11)
                .font('Helvetica-Bold')
                .text(edu.degree || 'Degree', { continued: true })
                .fontSize(10)
                .font('Helvetica')
                .text(` - ${edu.institution || 'Institution'}`);

            const eduDetails = [];
            if (edu.graduation) eduDetails.push(edu.graduation);
            if (edu.gpa) eduDetails.push(`GPA: ${edu.gpa}`);

            if (eduDetails.length > 0) {
                doc.fontSize(9)
                    .font('Helvetica-Oblique')
                    .text(eduDetails.join(' • '));
            }

            if (index < education.length - 1) {
                doc.moveDown(0.5);
            }
        });

        doc.moveDown(1);
    }

    // CERTIFICATIONS
    if (certifications && certifications.length > 0) {
        addSection(doc, 'Certifications');

        doc.fontSize(10).font('Helvetica');
        certifications.forEach(cert => {
            doc.text(`• ${cert}`);
            doc.moveDown(0.2);
        });
    }
}

/**
 * Adds a section header
 */
function addSection(doc, title) {
    doc.fontSize(14)
        .font('Helvetica-Bold')
        .text(title.toUpperCase());

    // Underline
    const lineY = doc.y + 2;
    doc.moveTo(50, lineY)
        .lineTo(doc.page.width - 50, lineY)
        .stroke();

    doc.moveDown(0.5);
}

module.exports = { generateResumePDF };
