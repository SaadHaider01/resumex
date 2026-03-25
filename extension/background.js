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
            apiUrl: 'http://localhost:3001'
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
