/**
 * Form Detector
 * 
 * Detects and identifies common job application form fields
 */

/**
 * Detect all form fields on the page
 * @returns {Object} Detected form fields
 */
function detectFormFields() {
    const fields = {
        fullName: null,
        firstName: null,
        lastName: null,
        email: null,
        phone: null,
        resumeUpload: null,
        coverLetterText: null,
        linkedIn: null,
        github: null
    };

    // Detect name fields
    fields.fullName = detectFullNameField();
    if (!fields.fullName) {
        fields.firstName = detectFirstNameField();
        fields.lastName = detectLastNameField();
    }

    // Detect contact fields
    fields.email = detectEmailField();
    fields.phone = detectPhoneField();
    fields.linkedIn = detectLinkedInField();
    fields.github = detectGitHubField();

    // Detect file upload
    fields.resumeUpload = detectResumeUploadField();

    // Detect cover letter textarea
    fields.coverLetterText = detectCoverLetterField();

    return fields;
}

/**
 * Detect full name input field
 */
function detectFullNameField() {
    const patterns = [
        'name',
        'full name',
        'fullname',
        'full_name',
        'applicant name',
        'your name'
    ];

    return findInputByPatterns(patterns, ['text']);
}

/**
 * Detect first name field
 */
function detectFirstNameField() {
    const patterns = [
        'first name',
        'firstname',
        'first_name',
        'fname',
        'given name'
    ];

    return findInputByPatterns(patterns, ['text']);
}

/**
 * Detect last name field
 */
function detectLastNameField() {
    const patterns = [
        'last name',
        'lastname',
        'last_name',
        'lname',
        'surname',
        'family name'
    ];

    return findInputByPatterns(patterns, ['text']);
}

/**
 * Detect email field
 */
function detectEmailField() {
    // First try input[type="email"]
    const emailInputs = document.querySelectorAll('input[type="email"]');
    if (emailInputs.length > 0) {
        return emailInputs[0];
    }

    // Then try pattern matching
    const patterns = [
        'email',
        'e-mail',
        'email address',
        'mail'
    ];

    return findInputByPatterns(patterns, ['text', 'email']);
}

/**
 * Detect phone field
 */
function detectPhoneField() {
    // Try input[type="tel"]
    const telInputs = document.querySelectorAll('input[type="tel"]');
    if (telInputs.length > 0) {
        return telInputs[0];
    }

    // Pattern matching
    const patterns = [
        'phone',
        'telephone',
        'mobile',
        'phone number',
        'contact number',
        'cell'
    ];

    return findInputByPatterns(patterns, ['text', 'tel']);
}

/**
 * Detect LinkedIn profile field
 */
function detectLinkedInField() {
    const patterns = [
        'linkedin',
        'linked in',
        'linkedin profile',
        'linkedin url'
    ];

    return findInputByPatterns(patterns, ['text', 'url']);
}

/**
 * Detect GitHub profile field
 */
function detectGitHubField() {
    const patterns = [
        'github',
        'github profile',
        'github url',
        'github username'
    ];

    return findInputByPatterns(patterns, ['text', 'url']);
}

/**
 * Detect resume upload field
 */
function detectResumeUploadField() {
    const fileInputs = document.querySelectorAll('input[type="file"]');

    for (const input of fileInputs) {
        const label = findLabelForInput(input);
        const patterns = [
            'resume',
            'cv',
            'curriculum vitae',
            'upload resume',
            'upload cv',
            'attach resume'
        ];

        // Check label, placeholder, name, id
        const text = [
            label?.textContent || '',
            input.placeholder || '',
            input.name || '',
            input.id || ''
        ].join(' ').toLowerCase();

        for (const pattern of patterns) {
            if (text.includes(pattern)) {
                return input;
            }
        }
    }

    // Fallback: return first file input
    return fileInputs.length > 0 ? fileInputs[0] : null;
}

/**
 * Detect cover letter textarea
 */
function detectCoverLetterField() {
    const textareas = document.querySelectorAll('textarea');

    for (const textarea of textareas) {
        const label = findLabelForInput(textarea);
        const patterns = [
            'cover letter',
            'cover_letter',
            'coverletter',
            'letter',
            'message',
            'additional information',
            'why are you interested',
            'tell us about yourself'
        ];

        const text = [
            label?.textContent || '',
            textarea.placeholder || '',
            textarea.name || '',
            textarea.id || ''
        ].join(' ').toLowerCase();

        for (const pattern of patterns) {
            if (text.includes(pattern)) {
                return textarea;
            }
        }
    }

    // Fallback: return largest textarea
    if (textareas.length > 0) {
        return Array.from(textareas).sort((a, b) => {
            const aSize = (a.rows || 5) * (a.cols || 40);
            const bSize = (b.rows || 5) * (b.cols || 40);
            return bSize - aSize;
        })[0];
    }

    return null;
}

/**
 * Helper: Find input by pattern matching
 */
function findInputByPatterns(patterns, types = ['text']) {
    const inputs = document.querySelectorAll(
        types.map(t => `input[type="${t}"]`).join(', ')
    );

    for (const input of inputs) {
        const label = findLabelForInput(input);

        const text = [
            label?.textContent || '',
            input.placeholder || '',
            input.name || '',
            input.id || ''
        ].join(' ').toLowerCase();

        for (const pattern of patterns) {
            if (text.includes(pattern)) {
                return input;
            }
        }
    }

    return null;
}

/**
 * Helper: Find label for input element
 */
function findLabelForInput(input) {
    // Try label[for="id"]
    if (input.id) {
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (label) return label;
    }

    // Try parent label
    let parent = input.parentElement;
    while (parent) {
        if (parent.tagName === 'LABEL') {
            return parent;
        }
        parent = parent.parentElement;
    }

    // Try previous sibling label
    let sibling = input.previousElementSibling;
    if (sibling && sibling.tagName === 'LABEL') {
        return sibling;
    }

    return null;
}

/**
 * Validate detected fields
 */
function validateDetectedFields(fields) {
    const issues = [];

    if (!fields.email) {
        issues.push('Email field not detected');
    }

    if (!fields.fullName && !fields.firstName && !fields.lastName) {
        issues.push('Name field not detected');
    }

    if (!fields.resumeUpload) {
        issues.push('Resume upload field not detected');
    }

    return {
        valid: issues.length === 0,
        issues,
        confidence: calculateConfidence(fields)
    };
}

/**
 * Calculate detection confidence score
 */
function calculateConfidence(fields) {
    const weights = {
        email: 0.3,
        fullName: 0.2,
        firstName: 0.1,
        lastName: 0.1,
        phone: 0.15,
        resumeUpload: 0.25,
        coverLetterText: 0.1
    };

    let score = 0;
    for (const [field, weight] of Object.entries(weights)) {
        if (fields[field]) {
            score += weight;
        }
    }

    return Math.round(score * 100);
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        detectFormFields,
        validateDetectedFields,
        calculateConfidence
    };
}
