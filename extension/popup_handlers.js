
/**
 * Save resume to vault
 */
async function handleSaveResume() {
    if (!currentResumeData) {
        showStatus('No resume to save. Generate a resume first.', 'error');
        return;
    }

    const jobTitle = jobTitleInput.value.trim();
    const githubUsername = extractGithubUsername(githubProfileInput.value);
    const apiUrl = await getApiUrl();

    // Validation
    if (!jobTitle) {
        showStatus('Please enter a job title', 'error');
        return;
    }

    try {
        saveBtn.disabled = true;
        saveBtn.textContent = '💾 Saving...';
        showStatus('Saving resume to vault...', 'loading');

        const response = await fetch(`${apiUrl}/api/save-resume`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jobTitle,
                company: '', // Auto-extracted or left empty
                githubUsername,
                resumeJSON: currentResumeData.resume,
                tailoringBlueprint: currentResumeData.tailoringBlueprint,
                jobDescription: currentJobDescription
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save resume');
        }

        const data = await response.json();

        showStatus('✅ Resume saved to vault successfully!', 'success');
        saveBtn.textContent = '✓ Saved!';

        setTimeout(() => {
            saveBtn.textContent = '💾 Save to Vault';
            saveBtn.disabled = false;
        }, 2000);

    } catch (error) {
        console.error('Error saving resume:', error);
        showStatus(`Error: ${error.message}`, 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Save to Vault';
    }
}

/**
 * Download resume as PDF
 */
async function handleDownloadPDF() {
    if (!currentResumeData) {
        showStatus('No resume to download. Generate a resume first.', 'error');
        return;
    }

    const jobTitle = jobTitleInput.value.trim();
    const githubUsername = extractGithubUsername(githubProfileInput.value);
    const apiUrl = await getApiUrl();

    // Validation
    if (!jobTitle) {
        showStatus('Please enter a job title to name the PDF', 'error');
        return;
    }

    try {
        downloadPdfBtn.disabled = true;
        downloadPdfBtn.textContent = '📥 Generating...';
        showStatus('Generating PDF...', 'loading');

        // First save the resume to get an ID
        const saveResponse = await fetch(`${apiUrl}/api/save-resume`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jobTitle,
                company: '',
                githubUsername,
                resumeJSON: currentResumeData.resume,
                tailoringBlueprint: currentResumeData.tailoringBlueprint,
                jobDescription: currentJobDescription
            })
        });

        if (!saveResponse.ok) {
            throw new Error('Failed to save resume');
        }

        const saveData = await saveResponse.json();
        const resumeId = saveData.resume._id;

        // Download PDF
        const pdfUrl = `${apiUrl}/api/resume/${resumeId}/pdf`;
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `${jobTitle.replace(/\s+/g, '_')}_resume.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showStatus('✅ PDF downloaded successfully!', 'success');
        downloadPdfBtn.textContent = '✓ Downloaded!';

        setTimeout(() => {
            downloadPdfBtn.textContent = '📥 Download PDF';
            downloadPdfBtn.disabled = false;
        }, 2000);

    } catch (error) {
        console.error('Error downloading PDF:', error);
        showStatus(`Error: ${error.message}`, 'error');
        downloadPdfBtn.disabled = false;
        downloadPdfBtn.textContent = '📥 Download PDF';
    }
}

/**
 * Show action buttons
 */
function showActionButtons() {
    actionButtonsDiv.classList.remove('hidden');
}
