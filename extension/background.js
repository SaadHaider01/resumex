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
    } else if (request.action === 'sync_profile') {
        const { linkedinUrl, githubUrl } = request;
        
        console.log(`Starting sync for LinkedIn: ${linkedinUrl}, GitHub: ${githubUrl}`);
        
        let linkedinData = null;
        let githubData = null;
        let linkedinTabId = null;
        let githubTabId = null;
        let isDone = false;
        
        // Clean up helper
        const cleanup = () => {
            isDone = true;
            if (linkedinTabId) {
                chrome.tabs.remove(linkedinTabId, () => {
                    if (chrome.runtime.lastError) console.log(chrome.runtime.lastError.message);
                });
            }
            if (githubTabId) {
                chrome.tabs.remove(githubTabId, () => {
                    if (chrome.runtime.lastError) console.log(chrome.runtime.lastError.message);
                });
            }
        };

        // Safety timeout (30 seconds)
        const timeoutId = setTimeout(() => {
            if (!isDone) {
                cleanup();
                sendResponse({ success: false, error: "Sync timed out. Please check your network and make sure you are logged in to LinkedIn." });
            }
        }, 30000);

        // Helper to check if both are done
        const checkCompleteness = () => {
            if (linkedinData && githubData) {
                clearTimeout(timeoutId);
                isDone = true;
                
                // Merge data
                const mergedProfile = {
                    syncedAt: Date.now(),
                    personalInfo: {
                        name: linkedinData.personalInfo.name || '',
                        email: linkedinData.personalInfo.email || '',
                        phone: linkedinData.personalInfo.phone || '',
                        location: linkedinData.personalInfo.location || '',
                        linkedin: linkedinUrl,
                        github: githubUrl
                    },
                    summary: linkedinData.summary || '',
                    skills: {
                        technical: linkedinData.skills || [],
                        languages: githubData.topLanguages || [],
                        tools: [],
                        soft: []
                    },
                    experience: linkedinData.experience || [],
                    education: linkedinData.education || [],
                    projects: githubData.projects || [],
                    certifications: linkedinData.certifications || []
                };

                chrome.storage.local.set({ userProfile: mergedProfile }, () => {
                    cleanup();
                    sendResponse({ success: true, profile: mergedProfile });
                });
            }
        };

        // 1. Helper to start GitHub Scraping
        const startGithubScrape = () => {
            if (isDone) return;
            
            let githubRepoUrl = githubUrl;
            if (!githubRepoUrl.includes('?tab=repositories') && !githubRepoUrl.includes('/repositories')) {
                const trimmed = githubRepoUrl.replace(/\/$/, '');
                githubRepoUrl = `${trimmed}?tab=repositories`;
            }

            chrome.tabs.create({ url: githubRepoUrl, active: true }, (tab) => {
                if (chrome.runtime.lastError) {
                    clearTimeout(timeoutId);
                    cleanup();
                    sendResponse({ success: false, error: `Failed to open GitHub URL: ${chrome.runtime.lastError.message}` });
                    return;
                }
                githubTabId = tab.id;
                
                const tabUpdateListener = (tabId, changeInfo) => {
                    if (tabId === githubTabId && changeInfo.status === 'complete') {
                        chrome.scripting.executeScript({
                            target: { tabId: githubTabId },
                            files: ['githubScraper.js']
                        }, () => {
                            if (chrome.runtime.lastError) {
                                console.error("GitHub scraper injection failed:", chrome.runtime.lastError.message);
                                clearTimeout(timeoutId);
                                cleanup();
                                sendResponse({ success: false, error: `GitHub injection failed: ${chrome.runtime.lastError.message}` });
                            }
                        });
                        chrome.tabs.onUpdated.removeListener(tabUpdateListener);
                    }
                };
                chrome.tabs.onUpdated.addListener(tabUpdateListener);
            });
        };

        // 2. Start LinkedIn Tab first
        chrome.tabs.create({ url: linkedinUrl, active: true }, (tab) => {
            if (chrome.runtime.lastError) {
                clearTimeout(timeoutId);
                isDone = true;
                sendResponse({ success: false, error: `Failed to open LinkedIn URL: ${chrome.runtime.lastError.message}` });
                return;
            }
            linkedinTabId = tab.id;
            
            // Listen for tab updates
            const tabUpdateListener = (tabId, changeInfo) => {
                if (tabId === linkedinTabId && changeInfo.status === 'complete') {
                    chrome.tabs.get(linkedinTabId, (currentTab) => {
                        if (chrome.runtime.lastError || !currentTab) return;
                        if (currentTab.url.includes('linkedin.com/authwall') || currentTab.url.includes('linkedin.com/login') || currentTab.url.includes('linkedin.com/signup')) {
                            chrome.tabs.onUpdated.removeListener(tabUpdateListener);
                            clearTimeout(timeoutId);
                            isDone = true;
                            // Make active so they can log in
                            chrome.tabs.update(linkedinTabId, { active: true });
                            sendResponse({ success: false, error: "Please log in to LinkedIn first, then try syncing again." });
                            return;
                        }

                        // Inject scraper script
                        chrome.scripting.executeScript({
                            target: { tabId: linkedinTabId },
                            files: ['linkedinScraper.js']
                        }, () => {
                            if (chrome.runtime.lastError) {
                                console.error("LinkedIn scraper injection failed:", chrome.runtime.lastError.message);
                                clearTimeout(timeoutId);
                                cleanup();
                                sendResponse({ success: false, error: `LinkedIn injection failed: ${chrome.runtime.lastError.message}` });
                            }
                        });
                        chrome.tabs.onUpdated.removeListener(tabUpdateListener);
                    });
                }
            };
            chrome.tabs.onUpdated.addListener(tabUpdateListener);
        });

        // 3. Listen for Scraping Messages
        const messageListener = (msg, sender) => {
            if (msg.type === 'LINKEDIN_SCRAPED' && sender.tab && sender.tab.id === linkedinTabId) {
                if (msg.success) {
                    linkedinData = msg.data || { personalInfo: {} };
                    // Close LinkedIn tab as soon as we're done with it
                    if (linkedinTabId) {
                        chrome.tabs.remove(linkedinTabId, () => {
                            if (chrome.runtime.lastError) console.log(chrome.runtime.lastError.message);
                        });
                        linkedinTabId = null;
                    }
                    // Start GitHub sequentially
                    startGithubScrape();
                } else {
                    clearTimeout(timeoutId);
                    cleanup();
                    sendResponse({ success: false, error: `LinkedIn Scrape Error: ${msg.error}` });
                }
            } else if (msg.type === 'GITHUB_SCRAPED' && sender.tab && sender.tab.id === githubTabId) {
                if (msg.success) {
                    githubData = msg.data || { projects: [] };
                    // Close GitHub tab as soon as we're done with it
                    if (githubTabId) {
                        chrome.tabs.remove(githubTabId, () => {
                            if (chrome.runtime.lastError) console.log(chrome.runtime.lastError.message);
                        });
                        githubTabId = null;
                    }
                    checkCompleteness();
                } else {
                    clearTimeout(timeoutId);
                    cleanup();
                    sendResponse({ success: false, error: `GitHub Scrape Error: ${msg.error}` });
                }
            }
            
            if (isDone) {
                chrome.runtime.onMessage.addListener(() => {}); // Dummy to prevent error if removed too fast
                chrome.runtime.onMessage.removeListener(messageListener);
            }
        };
        chrome.runtime.onMessage.addListener(messageListener);
    }
    return true;
});

console.log('ResumeX background service worker loaded');
