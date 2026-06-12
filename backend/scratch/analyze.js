const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'validation25_output.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

console.log('--- CATEGORY METRICS ---');
const categories = {};
data.forEach(item => {
    if (!categories[item.category]) {
        categories[item.category] = [];
    }
    categories[item.category].push(item.rrs.total);
});

for (const [cat, scores] of Object.entries(categories)) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    console.log(`${cat}: Avg RRS = ${avg.toFixed(2)} (Count: ${scores.length}, Scores: ${scores.join(', ')})`);
}

console.log('\n--- EVALUATING DETAILS ---');
let totalContradictions = 0;
let falsePositivesCount = 0;
let falseNegativesCount = 0;
let rankingMistakesCount = 0;

data.forEach(item => {
    const report = item.justification;
    const recruiter = item.recruiterAuditing;
    
    if (report.contradictions && report.contradictions.length > 0) {
        console.log(`[JD ${item.id} - ${item.role}] Contradictions: ${report.contradictions.join('; ')}`);
        totalContradictions += report.contradictions.length;
    }
    
    // Evaluate if experience selection was sub-optimal (e.g. RRS experience is not 20)
    if (item.rrs.experience < 20) {
        console.log(`[JD ${item.id} - ${item.role}] Experience score penalty: ${item.rrs.experience}/20. Top experience: ${report.included.find(i => i.startsWith('experience:'))}`);
        rankingMistakesCount++;
    }
    
    // Evaluate if project selection was sub-optimal (e.g. RRS project is not 20)
    if (item.rrs.project < 20) {
        console.log(`[JD ${item.id} - ${item.role}] Project score penalty: ${item.rrs.project}/20`);
    }

    // Evaluate if skills were sub-optimal (e.g. RRS skill is not 20)
    if (item.rrs.skill < 20) {
        console.log(`[JD ${item.id} - ${item.role}] Skill score penalty: ${item.rrs.skill}/20`);
    }
});
