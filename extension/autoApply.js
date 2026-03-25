/**
 * Auto Apply Engine
 * 
 * Handles autofilling application forms with user data
 */

/**
 * Fill personal information fields
 * @param {Object} fields - Detected form fields
 * @param {Object} userInfo - User information
 */
function fillPersonalInfo(fields, userInfo) {
    const filled = [];

    try {
        // Full name
        if (fields.fullName && userInfo.name) {
            setInputValue(fields.fullName, userInfo.name);
            filled.push('fullName');
        }

        // First and last name
        if (fields.firstName && userInfo.firstName) {
            setInputValue(fields.firstName, userInfo.firstName);
            filled.push('firstName');
        }
        if (fields.lastName && userInfo.lastName) {
            setInputValue(fields.lastName, userInfo.lastName);
            filled.push('lastName');
        }

        // Email
        if (fields.email && userInfo.email) {
            setInputValue(fields.email, userInfo.email);
            filled.push('email');
        }

        // Phone
        if (fields.phone && userInfo.phone) {
            setInputValue(fields.phone, userInfo.phone);
            filled.push('phone');
        }

        // LinkedIn
        if (fields.linkedIn && userInfo.linkedin) {
            setInputValue(fields.linkedIn, userInfo.linkedin);
            filled.push('linkedIn');
        }

        // GitHub
        if (fields.github && userInfo.github) {
            setInputValue(fields.github, userInfo.github);
            filled.push('github');
        }

        console.log('✅ Filled fields:', filled);
        return { success: true, filled };

    } catch (error) {
        console.error('Error filling personal info:', error);
        return { success: false, error: error.message, filled };
    }
}

/**
 * Insert cover letter into textarea
 * @param {Object} fields - Detected form fields
 * @param {string} coverLetter - Cover letter text
 */
function insertCoverLetter(fields, coverLetter) {
    if (!fields.coverLetterText) {
        return { success: false, error: 'Cover letter field not detected' };
    }

    if (!coverLetter) {
        return { success: false, error: 'No cover letter provided' };
    }

    try {
        setTextareaValue(fields.coverLetterText, coverLetter);

        console.log('✅ Cover letter inserted');
        return { success: true };

    } catch (error) {
        console.error('Error inserting cover letter:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Prepare resume for upload
 * @param {Object} fields - Detected form fields
 * @param {Blob} resumeBlob - Resume PDF as Blob
 * @param {string} filename - Filename for resume
 */
function prepareResumeUpload(fields, resumeBlob, filename = 'resume.pdf') {
    if (!fields.resumeUpload) {
        return { success: false, error: 'Resume upload field not detected' };
    }

    if (!resumeBlob) {
        return { success: false, error: 'No resume file provided' };
    }

    try {
        // Create File object from Blob
        const file = new File([resumeBlob], filename, { type: 'application/pdf' });

        // Create DataTransfer object
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);

        // Set files on input
        fields.resumeUpload.files = dataTransfer.files;

        // Trigger change event
        const changeEvent = new Event('change', { bubbles: true });
        fields.resumeUpload.dispatchEvent(changeEvent);

        console.log('✅ Resume prepared for upload:', filename);
        return { success: true, filename };

    } catch (error) {
        console.error('Error preparing resume upload:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Helper: Set input value with event triggering
 */
function setInputValue(input, value) {
    // Set value
    input.value = value;

    // Trigger events for frameworks (React, Vue, etc.)
    const events = [
        new Event('input', { bubbles: true }),
        new Event('change', { bubbles: true }),
        new Event('blur', { bubbles: true })
    ];

    events.forEach(event => input.dispatchEvent(event));

    // For React specifically
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
    ).set;

    nativeInputValueSetter.call(input, value);
    const reactEvent = new Event('input', { bubbles: true });
    input.dispatchEvent(reactEvent);
}

/**
 * Helper: Set textarea value with event triggering
 */
function setTextareaValue(textarea, value) {
    // Set value
    textarea.value = value;

    // Trigger events
    const events = [
        new Event('input', { bubbles: true }),
        new Event('change', { bubbles: true }),
        new Event('blur', { bubbles: true })
    ];

    events.forEach(event => textarea.dispatchEvent(event));

    // For React specifically
    const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
    ).set;

    nativeTextareaValueSetter.call(textarea, value);
    const reactEvent = new Event('input', { bubbles: true });
    textarea.dispatchEvent(reactEvent);
}

/**
 * Highlight filled fields for user visibility
 */
function highlightFilledFields(fields, filledList) {
    filledList.forEach(fieldName => {
        const element = fields[fieldName];
        if (element) {
            element.style.outline = '2px solid #28a745';
            element.style.outlineOffset = '2px';

            // Remove highlight after 3 seconds
            setTimeout(() => {
                element.style.outline = '';
                element.style.outlineOffset = '';
            }, 3000);
        }
    });
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fillPersonalInfo,
        insertCoverLetter,
        prepareResumeUpload,
        highlightFilledFields
    };
}
