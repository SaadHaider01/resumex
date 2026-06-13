
/**
 * Handle auto-fill application
 */
async function handleAutoFill() {
    try {
        autoFillBtn.disabled = true;
        autoFillBtn.textContent = '🤖 Auto-Filling...';
        showAutoFillStatus('Detecting form fields...', 'loading');

        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        // Retrieve custom email and phone from settings as fallbacks
        const savedSettings = await chrome.storage.local.get(['email', 'phone']);
        const customEmail = savedSettings.email || '';
        const customPhone = savedSettings.phone || '';

        // Prepare user info (includes LinkedIn from the input)
        const userInfo = {
            name: currentResumeData?.resume?.personalInfo?.name || '',
            firstName: currentResumeData?.resume?.personalInfo?.name?.split(' ')[0] || '',
            lastName: currentResumeData?.resume?.personalInfo?.name?.split(' ').slice(1).join(' ') || '',
            email: currentResumeData?.resume?.personalInfo?.email || customEmail,
            phone: currentResumeData?.resume?.personalInfo?.phone || customPhone,
            linkedin: ensureLinkedinUrl(linkedinProfileInput.value.trim() || currentResumeData?.resume?.personalInfo?.linkedin || ''),
            github: ensureGithubUrl(githubProfileInput.value.trim() || currentResumeData?.resume?.personalInfo?.github || '')
        };

        // Inject scripts into page
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['formDetector.js', 'autoApply.js', 'applyController.js']
        });

        // Get cover letter (if available)
        let coverLetter = null;
        const jobTitle = jobTitleInput.value.trim();
        const apiUrl = await getApiUrl();

        if (jobTitle && currentJobDescription && currentResumeData) {
            try {
                const clResponse = await fetch(`${apiUrl}/api/generate-cover-letter`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jobDescription: currentJobDescription,
                        tailoringBlueprint: currentResumeData.tailoringBlueprint,
                        resumeJSON: currentResumeData.resume,
                        company: '',
                        jobTitle
                    })
                });

                if (clResponse.ok) {
                    const clData = await clResponse.json();
                    coverLetter = clData.coverLetter;
                    console.log('✅ Cover letter generated for auto-fill');
                }
            } catch (error) {
                console.warn('⚠️ Cover letter generation failed:', error.message);
            }
        }

        // Get tailored resume PDF
        let pdfBytes = null;
        let resumeFilename = null;
        if (currentResumeData) {
            try {
                showAutoFillStatus('Generating and fetching tailored PDF...', 'loading');
                
                // Save resume silently first to get an ID
                const saveResponse = await fetch(`${apiUrl}/api/save-resume`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jobTitle: jobTitle || 'Tailored Resume',
                        company: '',
                        githubUsername: extractGithubUsername(githubProfileInput.value),
                        resumeJSON: currentResumeData.resume,
                        tailoringBlueprint: currentResumeData.tailoringBlueprint,
                        jobDescription: currentJobDescription
                    })
                });

                if (saveResponse.ok) {
                    const saveData = await saveResponse.json();
                    const resumeId = saveData.resume._id;
                    
                    // Fetch PDF bytes
                    const pdfResponse = await fetch(`${apiUrl}/api/resume/${resumeId}/pdf`);
                    if (pdfResponse.ok) {
                        const pdfArrayBuffer = await pdfResponse.arrayBuffer();
                        pdfBytes = Array.from(new Uint8Array(pdfArrayBuffer));
                        resumeFilename = `${(jobTitle || 'Tailored').replace(/\s+/g, '_')}_resume.pdf`;
                        console.log('✅ PDF fetched successfully for auto-fill');
                    }
                }
            } catch (error) {
                console.warn('⚠️ PDF fetching for auto-fill failed:', error.message);
            }
        }

        // Execute auto-fill in page
        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (userInfo, coverLetter, pdfBytes, resumeFilename) => {
                let resumeBlob = null;
                if (pdfBytes && pdfBytes.length > 0) {
                    const uint8Array = new Uint8Array(pdfBytes);
                    resumeBlob = new Blob([uint8Array], { type: 'application/pdf' });
                }

                return executeAutoFill({
                    userInfo,
                    coverLetter,
                    resumeBlob,
                    resumeFilename
                });
            },
            args: [userInfo, coverLetter, pdfBytes, resumeFilename]
        });

        const autoFillResult = result[0].result;

        if (autoFillResult.success) {
            showAutoFillStatus(
                `✅ Auto-filled ${autoFillResult.filledFields.length} fields!\n` +
                `Fields: ${autoFillResult.filledFields.join(', ')}`,
                'success'
            );
            autoFillBtn.textContent = '✓ Auto-Filled!';

            setTimeout(() => {
                autoFillBtn.textContent = '🤖 Auto-Fill Application';
                autoFillBtn.disabled = false;
            }, 3000);
        } else {
            throw new Error(autoFillResult.errors.join(', ') || 'Auto-fill failed');
        }

    } catch (error) {
        console.error('Auto-fill error:', error);
        showAutoFillStatus(`❌ ${error.message}`, 'error');
        autoFillBtn.disabled = false;
        autoFillBtn.textContent = '🤖 Auto-Fill Application';
    }
}

/**
 * Show auto-fill status message
 */
function showAutoFillStatus(message, type) {
    autoFillStatus.textContent = message;
    autoFillStatus.className = `auto-fill-status ${type}`;
    autoFillStatus.classList.remove('hidden');
}

/**
 * Show auto-fill section
 */
function showAutoFillSection() {
    autoFillSection.classList.remove('hidden');
}
