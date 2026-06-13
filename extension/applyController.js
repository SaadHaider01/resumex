/**
 * Apply Controller
 * 
 * Coordinates form detection and autofill operations
 */

/**
 * Execute auto-fill process
 * @param {Object} params - Autofill parameters
 * @returns {Promise<Object>} Result object
 */
async function executeAutoFill(params) {
    const {
        userInfo,
        coverLetter,
        resumeBlob,
        resumeFilename
    } = params;

    const result = {
        success: false,
        detectedFields: {},
        filledFields: [],
        errors: []
    };

    try {
        console.log('🔍 Step 1: Detecting form fields...');

        // Detect form fields
        const fields = detectFormFields();
        result.detectedFields = Object.keys(fields).filter(k => fields[k] !== null);

        console.log(`  ✅ Detected ${result.detectedFields.length} fields:`, result.detectedFields);

        // Validate detection
        const validation = validateDetectedFields(fields);
        console.log(`  📊 Confidence: ${validation.confidence}%`);

        if (validation.issues.length > 0) {
            console.warn('  ⚠️ Detection issues:', validation.issues);
            result.errors.push(...validation.issues);
        }

        // Step 2: Fill personal information
        if (userInfo) {
            console.log('📝 Step 2: Filling personal information...');
            const fillResult = fillPersonalInfo(fields, userInfo);

            if (fillResult.success) {
                result.filledFields.push(...fillResult.filled);
                highlightFilledFields(fields, fillResult.filled);
            } else {
                result.errors.push(`Personal info fill failed: ${fillResult.error}`);
            }
        }

        // Step 3: Insert cover letter
        if (coverLetter) {
            if (fields.coverLetterText) {
                console.log('📄 Step 3: Inserting cover letter...');
                const insertResult = insertCoverLetter(fields, coverLetter);

                if (insertResult.success) {
                    result.filledFields.push('coverLetter');
                    highlightFilledFields(fields, ['coverLetterText']);
                } else {
                    result.errors.push(`Cover letter insert failed: ${insertResult.error}`);
                }
            } else {
                console.warn('⚠️ Cover letter field not detected on page');
                result.errors.push('Cover letter text field not detected on page');
            }
        }

        // Step 4: Prepare resume upload
        if (resumeBlob && fields.resumeUpload) {
            console.log('📎 Step 4: Preparing resume upload...');
            const uploadResult = prepareResumeUpload(fields, resumeBlob, resumeFilename);

            if (uploadResult.success) {
                result.filledFields.push('resume');
                highlightFilledFields(fields, ['resumeUpload']);
            } else {
                result.errors.push(`Resume upload failed: ${uploadResult.error}`);
            }
        }

        // Determine overall success
        result.success = result.filledFields.length > 0;

        console.log('\n✅ Auto-fill complete!');
        console.log(`  Filled: ${result.filledFields.length} fields`);
        console.log(`  Errors: ${result.errors.length}`);

        return result;

    } catch (error) {
        console.error('❌ Auto-fill failed:', error);
        result.errors.push(error.message);
        return result;
    }
}

/**
 * Get form summary for user preview
 */
function getFormSummary() {
    const fields = detectFormFields();
    const validation = validateDetectedFields(fields);

    return {
        detectedFields: Object.keys(fields).filter(k => fields[k] !== null),
        confidence: validation.confidence,
        issues: validation.issues,
        recommendations: generateRecommendations(fields, validation)
    };
}

/**
 * Generate recommendations based on detection
 */
function generateRecommendations(fields, validation) {
    const recommendations = [];

    if (!fields.email) {
        recommendations.push('Manually enter your email address');
    }

    if (!fields.resumeUpload) {
        recommendations.push('Manually upload your resume');
    }

    if (!fields.fullName && !fields.firstName) {
        recommendations.push('Manually enter your name');
    }

    if (validation.confidence < 50) {
        recommendations.push('Form detection confidence is low - verify all fields after autofill');
    }

    return recommendations;
}

/**
 * Test form detection (for debugging)
 */
function testFormDetection() {
    console.log('🧪 Testing form detection...\n');

    const fields = detectFormFields();
    const validation = validateDetectedFields(fields);

    console.log('Detected Fields:');
    for (const [key, value] of Object.entries(fields)) {
        if (value) {
            const label = findLabelForInput(value);
            console.log(`  ✅ ${key}:`, {
                tag: value.tagName,
                type: value.type,
                name: value.name,
                id: value.id,
                label: label?.textContent?.trim() || 'No label'
            });
        } else {
            console.log(`  ❌ ${key}: Not detected`);
        }
    }

    console.log('\nValidation:');
    console.log(`  Confidence: ${validation.confidence}%`);
    console.log(`  Valid: ${validation.valid}`);
    if (validation.issues.length > 0) {
        console.log(`  Issues:`, validation.issues);
    }

    return { fields, validation };
}

// Helper function (for consistency)
function findLabelForInput(input) {
    if (input.id) {
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (label) return label;
    }

    let parent = input.parentElement;
    while (parent) {
        if (parent.tagName === 'LABEL') return parent;
        parent = parent.parentElement;
    }

    let sibling = input.previousElementSibling;
    if (sibling && sibling.tagName === 'LABEL') return sibling;

    return null;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        executeAutoFill,
        getFormSummary,
        testFormDetection
    };
}
