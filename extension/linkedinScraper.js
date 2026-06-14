(async function() {
    console.log("🚀 LinkedIn Scraper injected and running...");
    
    // Auto-scroll to load lazy sections
    const autoScroll = async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 500;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight || totalHeight > 8000) {
                    clearInterval(timer);
                    window.scrollTo(0, 0);
                    resolve();
                }
            }, 100);
        });
    };

    // Helper: get first non-empty text from a list of selectors
    const firstText = (parent, selectors) => {
        for (const sel of selectors) {
            const el = parent.querySelector(sel);
            if (el && el.textContent.trim()) return el.textContent.trim();
        }
        return '';
    };

    // Helper: find a <section> whose h2 matches a regex
    const findSection = (pattern) => {
        const sections = document.querySelectorAll('section.artdeco-card, section');
        for (const s of sections) {
            const h2 = s.querySelector('h2');
            if (h2 && pattern.test(h2.textContent.trim())) return s;
        }
        return null;
    };

    // Helper: get all visible span[aria-hidden="true"] text in an element
    const allAriaTexts = (parent) =>
        [...parent.querySelectorAll('span[aria-hidden="true"]')]
            .map(e => e.textContent.trim())
            .filter(Boolean);

    try {
        console.log("Scrolling page...");
        await autoScroll();
        await new Promise(r => setTimeout(r, 800));

        const profileData = {
            personalInfo: {
                name: '',
                email: '',
                phone: '',
                location: '',
                linkedin: window.location.href.split('?')[0],
                github: ''
            },
            summary: '',
            experience: [],
            education: [],
            certifications: [],
            skills: []
        };

        // ── 1. NAME ─────────────────────────────────────────────────────────
        const nameEl =
            document.querySelector('h1.text-heading-xlarge') ||
            document.querySelector('.pv-text-details__left-panel h1') ||
            document.querySelector('.profile-info-subheader h1') ||
            document.querySelector('[data-generated-suggestion-target] h1') ||
            document.querySelector('h1');
        if (nameEl) profileData.personalInfo.name = nameEl.textContent.trim();
        // Fallback: page title
        if (!profileData.personalInfo.name) {
            profileData.personalInfo.name = document.title.split('|')[0].trim();
        }

        // ── 2. LOCATION ──────────────────────────────────────────────────────
        const locEl =
            document.querySelector('.pv-text-details__left-panel .text-body-small.inline') ||
            document.querySelector('.mt2 .text-body-small') ||
            document.querySelector('span.text-body-small.inline.t-black--light');
        if (locEl) profileData.personalInfo.location = locEl.textContent.trim();

        // ── 3. ABOUT / SUMMARY ───────────────────────────────────────────────
        const aboutSection = findSection(/^about$/i);
        if (aboutSection) {
            const visibleSpan =
                aboutSection.querySelector('.display-flex.ph5.pv3 span[aria-hidden="true"]') ||
                aboutSection.querySelector('span[aria-hidden="true"]');
            if (visibleSpan) {
                profileData.summary = visibleSpan.textContent.trim()
                    .replace(/\s*see more\s*$/i, '')
                    .replace(/\s*…see more\s*$/i, '');
            }
        }

        // ── 4. EXPERIENCE ────────────────────────────────────────────────────
        const expSection = findSection(/experience/i);
        if (expSection) {
            console.log("Found Experience section");
            const listItems = expSection.querySelectorAll(
                'li.pvs-list__paged-list-item, li.artdeco-list__item, li[class*="pvs-list"]'
            );

            listItems.forEach(item => {
                // Skip nested items that belong to a parent role group
                if (item.closest('ul ul') && !item.closest('[data-view-name="profile-component-entity"]')) return;

                const spans = allAriaTexts(item);
                if (spans.length < 2) return;

                // Check if this item contains a nested role list (multi-role at same company)
                const subList = item.querySelector('ul.pvs-list');
                if (subList) {
                    // Multi-role at same company
                    const companyName = spans[0].split(' · ')[0];
                    const roles = subList.querySelectorAll('li');
                    roles.forEach(role => {
                        const roleSpans = allAriaTexts(role);
                        if (roleSpans.length >= 1) {
                            const title = roleSpans[0];
                            const duration = roleSpans.find(s => /\d{4}|present|yr|mo/i.test(s)) || 'Unknown';
                            const descSpans = roleSpans.slice(3);
                            profileData.experience.push({
                                company: companyName,
                                position: title,
                                duration,
                                location: 'Remote',
                                achievements: descSpans.filter(s =>
                                    s.length > 20 && !/\d{4}/.test(s) && s !== title && s !== companyName
                                )
                            });
                        }
                    });
                } else {
                    // Single role
                    const title = spans[0];
                    const companyRaw = spans[1] || '';
                    const company = companyRaw.split(' · ')[0];

                    // Duration: look for a span with year/month pattern
                    const duration = spans.find(s => /\d{4}|present|yr|mo/i.test(s)) || 'Unknown';

                    // Achievements: remaining spans that look like descriptions
                    const descStart = 2;
                    const achievements = spans.slice(descStart).filter(s =>
                        s.length > 20 &&
                        !/^\d{4}/.test(s) &&
                        !/^(present|full.time|part.time|contract|freelance)/i.test(s) &&
                        s !== title && s !== company
                    );

                    if (title && company) {
                        profileData.experience.push({
                            company,
                            position: title,
                            duration,
                            location: 'Remote',
                            achievements
                        });
                    }
                }
            });
        }
        console.log(`Scraped ${profileData.experience.length} experience entries`);

        // ── 5. EDUCATION ─────────────────────────────────────────────────────
        const eduSection = findSection(/education/i);
        if (eduSection) {
            console.log("Found Education section");
            const items = eduSection.querySelectorAll(
                'li.pvs-list__paged-list-item, li.artdeco-list__item'
            );
            items.forEach(item => {
                const spans = allAriaTexts(item);
                if (spans.length < 2) return;

                const institution = spans[0];
                const degree = spans[1];

                // Find graduation year
                const yearSpan = spans.find(s => /\d{4}/.test(s));
                const years = yearSpan ? yearSpan.match(/\d{4}/g) : null;
                const graduation = years ? years[years.length - 1] : 'N/A';

                profileData.education.push({ degree, institution, graduation, gpa: null });
            });
        }
        console.log(`Scraped ${profileData.education.length} education entries`);

        // ── 6. SKILLS ────────────────────────────────────────────────────────
        const skillsSection = findSection(/skills/i);
        if (skillsSection) {
            console.log("Found Skills section");
            const spans = skillsSection.querySelectorAll('span[aria-hidden="true"]');
            const seen = new Set();
            spans.forEach(sp => {
                const text = sp.textContent.trim();
                if (
                    text &&
                    text.length < 60 &&
                    text.length > 1 &&
                    !text.includes('•') &&
                    !text.toLowerCase().includes('endorsed') &&
                    !text.toLowerCase().includes('skill assessment') &&
                    !text.toLowerCase().includes('show all') &&
                    !text.toLowerCase().includes('see more') &&
                    !/^\d+$/.test(text) &&
                    !seen.has(text)
                ) {
                    seen.add(text);
                    profileData.skills.push(text);
                }
            });
        }
        console.log(`Scraped ${profileData.skills.length} skills`);

        // ── 7. CERTIFICATIONS ────────────────────────────────────────────────
        const certsSection = findSection(/licens|certific/i);
        if (certsSection) {
            const items = certsSection.querySelectorAll(
                'li.pvs-list__paged-list-item, li.artdeco-list__item'
            );
            items.forEach(item => {
                const nameEl = item.querySelector('span[aria-hidden="true"]');
                if (nameEl) {
                    const cert = nameEl.textContent.trim();
                    if (cert && !profileData.certifications.includes(cert)) {
                        profileData.certifications.push(cert);
                    }
                }
            });
        }

        console.log("✅ Parsed profile:", profileData);

        chrome.runtime.sendMessage({
            type: "LINKEDIN_SCRAPED",
            success: true,
            data: profileData
        });

    } catch (e) {
        console.error("LinkedIn Scraper error:", e);
        chrome.runtime.sendMessage({
            type: "LINKEDIN_SCRAPED",
            success: false,
            error: e.message
        });
    }
})();
