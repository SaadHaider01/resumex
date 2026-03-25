const { generateResumePDF } = require('../services/pdfExportService');
const fs = require('fs');
const path = require('path');

/**
 * Test: PDF Export Service
 */

const mockResume = {
    personalInfo: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-123-4567',
        location: 'San Francisco, CA',
        linkedin: 'linkedin.com/in/johndoe',
        github: 'github.com/johndoe'
    },
    professionalSummary: 'Experienced Full Stack Developer with 5+ years building scalable web applications. Expert in React, Node.js, and cloud platforms.',
    skills: {
        technical: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'MongoDB'],
        tools: ['Git', 'Docker', 'AWS', 'CI/CD'],
        soft: ['Leadership', 'Communication', 'Problem Solving']
    },
    experience: [
        {
            position: 'Senior Software Engineer',
            company: 'Tech Corp',
            duration: 'Jan 2020 - Present',
            location: 'San Francisco, CA',
            achievements: [
                'Led team of 5 developers to build microservices architecture',
                'Reduced API response time by 40% through optimization',
                'Implemented CI/CD pipeline reducing deployment time by 60%'
            ]
        }
    ],
    projects: [
        {
            name: 'E-Commerce Platform',
            technologies: ['React', 'Node.js', 'MongoDB', 'Stripe'],
            description: 'Full-stack e-commerce solution with payment integration',
            highlights: [
                'Processed over $1M in transactions',
                'Achieved 99.9% uptime'
            ]
        }
    ],
    education: [
        {
            degree: 'B.S. Computer Science',
            institution: 'University of California',
            graduation: '2018',
            gpa: '3.8'
        }
    ],
    certifications: ['AWS Certified Solutions Architect', 'MongoDB Certified Developer']
};

async function testPDFGeneration() {
    console.log('📄 Testing PDF Generation...\n');

    try {
        // Generate PDF
        console.log('Generating PDF from resume JSON...');
        const pdfBuffer = await generateResumePDF(mockResume);

        console.log(`✅ PDF generated successfully (${pdfBuffer.length} bytes)`);

        // Save to file for manual verification
        const outputPath = path.join(__dirname, 'test_resume.pdf');
        fs.writeFileSync(outputPath, pdfBuffer);

        console.log(`📁 PDF saved to: ${outputPath}`);
        console.log('\n✅ PDF Export Test PASSED');

        return true;
    } catch (error) {
        console.error('❌ PDF Export Test FAILED');
        console.error(error.message);
        return false;
    }
}

// Run test
if (require.main === module) {
    testPDFGeneration()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test execution error:', error);
            process.exit(1);
        });
}

module.exports = { testPDFGeneration };
