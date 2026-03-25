/**
 * Content Script
 * 
 * Runs in the context of web pages
 * Currently minimal - job extraction happens via executeScript in popup.js
 */

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractJobDescription') {
        try {
            const jobDescription = extractPageText();
            sendResponse({ success: true, jobDescription });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }
    return true; // Keep message channel open for async response
});

/**
 * Extract text from current page
 */
function extractPageText() {
    // Clone body to avoid modifying actual DOM
    const clonedBody = document.body.cloneNode(true);

    // Remove unwanted elements
    const unwantedSelectors = ['script', 'style', 'nav', 'header', 'footer', 'iframe', 'noscript', 'aside'];
    unwantedSelectors.forEach(selector => {
        clonedBody.querySelectorAll(selector).forEach(el => el.remove());
    });

    // Get text content
    let text = clonedBody.innerText || clonedBody.textContent || '';

    // Clean up whitespace
    text = text
        .replace(/\s+/g, ' ')      // Multiple spaces -> single space
        .replace(/\n+/g, '\n')     // Multiple newlines -> single newline
        .trim();

    return text;
}

// Log that content script is loaded
console.log('ResumeX content script loaded');
