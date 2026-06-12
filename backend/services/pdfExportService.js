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
                margins: { top: 54, bottom: 54, left: 54, right: 54 }
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
    const margin = 54;
    const contentWidth = doc.page.width - (margin * 2);

    // HEADER - Personal Info
    if (personalInfo) {
        doc.fontSize(20)
            .font('Helvetica-Bold')
            .text(personalInfo.name || 'Resume', { align: 'center' });

        doc.moveDown(0.25);

        const contactInfo = [];
        if (personalInfo.email) contactInfo.push(personalInfo.email);
        if (personalInfo.phone) contactInfo.push(personalInfo.phone);
        if (personalInfo.location) contactInfo.push(personalInfo.location);

        doc.fontSize(9.5)
            .font('Helvetica')
            .text(contactInfo.join('  |  '), { align: 'center' });

        if (personalInfo.linkedin || personalInfo.github) {
            const links = [];
            if (personalInfo.linkedin) links.push(personalInfo.linkedin);
            if (personalInfo.github) links.push(personalInfo.github);
            doc.fontSize(9.5)
                .font('Helvetica')
                .text(links.join('  |  '), { align: 'center' });
        }

        doc.moveDown(0.8);
    }

    // PROFESSIONAL SUMMARY
    if (professionalSummary) {
        addSection(doc, 'Professional Summary');
        doc.fontSize(9.5)
            .font('Helvetica')
            .text(professionalSummary, { align: 'justify', lineGap: 2 });
        doc.moveDown(0.8);
    }

    // SKILLS
    if (skills) {
        addSection(doc, 'Skills');

        let skillsRendered = false;
        
        const renderSkillCategory = (title, list) => {
            if (list && list.length > 0) {
                const startY = doc.y;
                doc.fontSize(9.5).font('Helvetica-Bold').text(title, margin, startY, { width: 130 });
                doc.font('Helvetica').text(list.join(', '), margin + 135, startY, { width: contentWidth - 135, lineGap: 1.5 });
                doc.y = Math.max(doc.y, startY + 12);
                doc.x = margin;
                doc.moveDown(0.35);
                skillsRendered = true;
            }
        };

        renderSkillCategory('Technical Skills', skills.technical);
        renderSkillCategory('Tools & Technologies', skills.tools);
        renderSkillCategory('Soft Skills', skills.soft);

        doc.x = margin;
        if (skillsRendered) {
            doc.moveDown(0.4);
        }
    }

    // EXPERIENCE
    if (experience && experience.length > 0) {
        addSection(doc, 'Experience');

        experience.forEach((job, index) => {
            const startY = doc.y;
            
            // Company and position
            doc.fontSize(10.5)
                .font('Helvetica-Bold')
                .text(`${job.position || 'Position'}`, margin, startY, { width: 320 });

            // Duration and location (Right-aligned)
            const durationText = `${job.duration || ''}${job.location ? '  •  ' + job.location : ''}`;
            doc.fontSize(9.5)
                .font('Helvetica-Oblique')
                .text(durationText, margin + 320, startY, { width: contentWidth - 320, align: 'right' });

            // Reset cursor X and Y to below the header row
            doc.y = Math.max(doc.y, startY + 12);
            doc.x = margin;
            doc.moveDown(0.2);

            // Print Company Name
            if (job.company) {
                doc.fontSize(9.5).font('Helvetica-Bold').text(job.company);
                doc.moveDown(0.25);
            }

            // Achievements (clean bullet points)
            if (job.achievements && job.achievements.length > 0) {
                doc.font('Helvetica').fontSize(9.5);
                doc.list(job.achievements, {
                    bulletRadius: 1.5,
                    textIndent: 12,
                    bulletGap: 5,
                    paragraphGap: 2
                });
            }

            // Reset X coordinate again to prevent side-effect in next iterations
            doc.x = margin;

            if (index < experience.length - 1) {
                doc.moveDown(0.7);
            }
        });

        doc.moveDown(0.8);
    }

    // PROJECTS
    if (projects && projects.length > 0) {
        addSection(doc, 'Projects');

        projects.forEach((project, index) => {
            const startY = doc.y;

            // Project Name
            doc.fontSize(10.5)
                .font('Helvetica-Bold')
                .text(project.name || 'Project', margin, startY, { width: 320 });

            // Technologies used (Right-aligned)
            if (project.technologies && project.technologies.length > 0) {
                const techText = project.technologies.join(', ');
                doc.fontSize(9.5)
                    .font('Helvetica-Oblique')
                    .text(techText, margin + 320, startY, { width: contentWidth - 320, align: 'right' });
            }

            // Reset cursor X and Y
            doc.y = Math.max(doc.y, startY + 12);
            doc.x = margin;
            doc.moveDown(0.25);

            // Description
            if (project.description) {
                doc.fontSize(9.5).font('Helvetica').text(project.description, { lineGap: 1.5 });
                doc.moveDown(0.25);
            }

            // Project Highlights
            if (project.highlights && project.highlights.length > 0) {
                doc.fontSize(9.5).font('Helvetica');
                doc.list(project.highlights, {
                    bulletRadius: 1.5,
                    textIndent: 12,
                    bulletGap: 5,
                    paragraphGap: 2
                });
            }

            // Reset X coordinate again
            doc.x = margin;

            if (index < projects.length - 1) {
                doc.moveDown(0.7);
            }
        });

        doc.moveDown(0.8);
    }

    // EDUCATION
    if (education && education.length > 0) {
        addSection(doc, 'Education');

        education.forEach((edu, index) => {
            const startY = doc.y;
            
            // Degree
            doc.fontSize(10.5)
                .font('Helvetica-Bold')
                .text(edu.degree || 'Degree', margin, startY, { width: 320 });

            // Graduation date and GPA (Right-aligned)
            const eduDetails = [];
            if (edu.graduation) eduDetails.push(edu.graduation);
            if (edu.gpa) eduDetails.push(`GPA: ${edu.gpa}`);

            if (eduDetails.length > 0) {
                doc.fontSize(9.5)
                    .font('Helvetica-Oblique')
                    .text(eduDetails.join('  •  '), margin + 320, startY, { width: contentWidth - 320, align: 'right' });
            }

            // Reset cursor X and Y
            doc.y = Math.max(doc.y, startY + 12);
            doc.x = margin;
            doc.moveDown(0.2);

            // Institution name
            if (edu.institution) {
                doc.fontSize(9.5).font('Helvetica').text(edu.institution);
            }

            // Reset X coordinate again
            doc.x = margin;

            if (index < education.length - 1) {
                doc.moveDown(0.5);
            }
        });

        doc.moveDown(0.8);
    }

    // CERTIFICATIONS
    if (certifications && certifications.length > 0) {
        addSection(doc, 'Certifications');

        doc.fontSize(9.5).font('Helvetica');
        doc.list(certifications, {
            bulletRadius: 1.5,
            textIndent: 12,
            bulletGap: 5,
            paragraphGap: 2
        });
        
        doc.x = margin;
    }
}

/**
 * Adds a section header
 */
function addSection(doc, title) {
    // Reset X coordinate to ensure section header aligns to left margin
    doc.x = 54;

    doc.fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#2d3748')
        .text(title.toUpperCase());

    // Underline divider line
    const lineY = doc.y + 2;
    doc.moveTo(54, lineY)
        .lineTo(doc.page.width - 54, lineY)
        .strokeColor('#cbd5e0')
        .lineWidth(0.8)
        .stroke();

    doc.fillColor('#000000'); // Reset text color
    doc.moveDown(0.45);
}

module.exports = { generateResumePDF };
