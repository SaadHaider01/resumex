const fs = require('fs');
const path = require('path');
const { generateResumePDF } = require('./services/pdfExportService');

const dbFilePath = path.join(__dirname, 'resumes_db.json');
const outputPdfPath = path.join(__dirname, '..', 'resume.pdf');

async function main() {
    try {
        if (!fs.existsSync(dbFilePath)) {
            console.error(`Error: Local database file not found at ${dbFilePath}`);
            return;
        }

        const data = fs.readFileSync(dbFilePath, 'utf8');
        const resumes = JSON.parse(data || '[]');

        if (resumes.length === 0) {
            console.error('Error: No resumes found in the database.');
            return;
        }

        // Sort by createdAt desc
        resumes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const latestResume = resumes[0];
        console.log(`Generating PDF for latest resume: "${latestResume.jobTitle}" at "${latestResume.company}"...`);

        const pdfBuffer = await generateResumePDF(latestResume.resumeJSON);
        fs.writeFileSync(outputPdfPath, pdfBuffer);

        console.log(`\n✅ PDF successfully generated and saved to: ${path.resolve(outputPdfPath)}`);
        console.log(`Size: ${pdfBuffer.length} bytes`);
    } catch (error) {
        console.error('Error compiling PDF:', error);
    }
}

main();
