(function() {
    console.log("🚀 LinkedIn Scraper injected and running...");
    try {
        // Helper to find a section by header text
        const findSectionByTitle = (titlePattern) => {
            const sections = document.querySelectorAll('section');
            for (const section of sections) {
                const header = section.querySelector('h2');
                if (header && titlePattern.test(header.textContent.trim())) {
                    return section;
                }
            }
            return null;
        };

        const profileData = {
            personalInfo: {
                name: '',
                email: '',
                phone: '',
                location: '',
                linkedin: window.location.href,
                github: ''
            },
            summary: '',
            experience: [],
            education: [],
            certifications: [],
            skills: []
        };

        // 1. Get Name
        const nameEl = document.querySelector('h1.text-heading-xlarge') || 
                       document.querySelector('.pv-text-details__left-panel h1') ||
                       document.querySelector('h1');
        if (nameEl) {
            profileData.personalInfo.name = nameEl.textContent.trim();
        } else {
            const titleMatch = document.title.split('|')[0] || '';
            profileData.personalInfo.name = titleMatch.trim();
        }

        // 2. Get Location
        const locEl = document.querySelector('.text-body-small.inline.t-black-t-normal') ||
                      document.querySelector('.pv-text-details__left-panel--mt4 span.text-body-small');
        if (locEl) {
            profileData.personalInfo.location = locEl.textContent.trim();
        }

        // 3. Get About / Summary
        const aboutSection = findSectionByTitle(/about/i);
        if (aboutSection) {
            const textContainer = aboutSection.querySelector('.display-flex span[aria-hidden="true"]') ||
                                  aboutSection.querySelector('.pv-shared-text-with-see-more') ||
                                  aboutSection;
            if (textContainer) {
                profileData.summary = textContainer.textContent.trim().replace(/\s+see\s+more$/i, '');
            }
        }

        // 4. Get Experience
        const expSection = findSectionByTitle(/experience/i);
        if (expSection) {
            const items = expSection.querySelectorAll('li.pvs-list__paged-list-item, li.artdeco-list__item');
            items.forEach(item => {
                const subList = item.querySelector('ul');
                if (subList) {
                    const companyNameEl = item.querySelector('div.display-flex.align-items-center span[aria-hidden="true"]');
                    const company = companyNameEl ? companyNameEl.textContent.trim().split(' · ')[0] : '';
                    
                    const roles = subList.querySelectorAll('li');
                    roles.forEach(role => {
                        const titleEl = role.querySelector('span[aria-hidden="true"]');
                        const durationEl = role.querySelector('.t-14.t-black--light span[aria-hidden="true"]');
                        const descEl = role.querySelector('.pvs-list__outer-container span[aria-hidden="true"]');
                        
                        if (titleEl) {
                            profileData.experience.push({
                                company: company || 'Unknown Company',
                                position: titleEl.textContent.trim(),
                                duration: durationEl ? durationEl.textContent.trim().split(' · ')[0] : 'Unknown',
                                location: 'Remote',
                                achievements: descEl ? descEl.textContent.trim().split('\n').map(a => a.trim()).filter(Boolean) : []
                            });
                        }
                    });
                } else {
                    const details = item.querySelectorAll('span[aria-hidden="true"]');
                    if (details.length >= 2) {
                        const title = details[0].textContent.trim();
                        const companyInfo = details[1].textContent.trim().split(' · ');
                        const company = companyInfo[0] || 'Unknown Company';
                        
                        let duration = 'Unknown';
                        let desc = '';
                        
                        const textLight = item.querySelectorAll('.t-14.t-black--light span[aria-hidden="true"]');
                        if (textLight.length > 0) {
                            duration = textLight[0].textContent.trim().split(' · ')[0];
                        }
                        
                        const descEl = item.querySelector('.inline-show-more-text span[aria-hidden="true"]') ||
                                       item.querySelector('.pvs-list__outer-container span[aria-hidden="true"]');
                        if (descEl) {
                            desc = descEl.textContent.trim();
                        }

                        profileData.experience.push({
                            company,
                            position: title,
                            duration,
                            location: 'Remote',
                            achievements: desc ? desc.split('\n').map(a => a.trim()).filter(Boolean) : []
                        });
                    }
                }
            });
        }

        // 5. Get Education
        const eduSection = findSectionByTitle(/education/i);
        if (eduSection) {
            const items = eduSection.querySelectorAll('li.pvs-list__paged-list-item, li.artdeco-list__item');
            items.forEach(item => {
                const details = item.querySelectorAll('span[aria-hidden="true"]');
                if (details.length >= 2) {
                    const institution = details[0].textContent.trim();
                    const degree = details[1].textContent.trim();
                    
                    let graduation = 'N/A';
                    const textLight = item.querySelectorAll('.t-14.t-black--light span[aria-hidden="true"]');
                    if (textLight.length > 0) {
                        const dateText = textLight[0].textContent.trim();
                        const years = dateText.match(/\d{4}/g);
                        if (years && years.length > 0) {
                            graduation = years[years.length - 1];
                        }
                    }

                    profileData.education.push({
                        degree,
                        institution,
                        graduation,
                        gpa: null
                    });
                }
            });
        }

        // 6. Get Skills
        const skillsSection = findSectionByTitle(/skills/i);
        if (skillsSection) {
            const items = skillsSection.querySelectorAll('span[aria-hidden="true"]');
            items.forEach(item => {
                const skill = item.textContent.trim();
                if (skill && skill.length < 50 && !skill.includes('•') && !skill.includes('endorsed') && !skill.toLowerCase().includes('skill assessment')) {
                    profileData.skills.push(skill);
                }
            });
            profileData.skills = [...new Set(profileData.skills)];
        }

        // 7. Get Certifications
        const certsSection = findSectionByTitle(/licens|certific/i);
        if (certsSection) {
            const items = certsSection.querySelectorAll('li.pvs-list__paged-list-item, li.artdeco-list__item');
            items.forEach(item => {
                const details = item.querySelector('span[aria-hidden="true"]');
                if (details) {
                    profileData.certifications.push(details.textContent.trim());
                }
            });
        }

        console.log("Parsed profile data:", profileData);
        
        // Send message back
        chrome.runtime.sendMessage({
            type: "LINKEDIN_SCRAPED",
            success: true,
            data: profileData
        });
    } catch (e) {
        console.error("Scraper error:", e);
        chrome.runtime.sendMessage({
            type: "LINKEDIN_SCRAPED",
            success: false,
            error: e.message
        });
    }
})();
