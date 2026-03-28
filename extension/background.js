/**
 * Background Service Worker (Manifest V3)
 * 
 * Handles extension lifecycle and background tasks
 */

// Extension installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('ResumeX extension installed');

        // Set default values
        chrome.storage.local.set({
            apiUrl: 'https://resumex-5ij7.onrender.com'
        });
    } else if (details.reason === 'update') {
        console.log('ResumeX extension updated');
    }
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ping') {
        sendResponse({ status: 'ok' });
    }
    return true;
});

console.log('ResumeX background service worker loaded');
