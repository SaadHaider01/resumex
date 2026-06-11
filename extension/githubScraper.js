(function() {
    console.log("🚀 GitHub Scraper injected and running...");
    try {
        const projects = [];

        // Find all repository items in the list
        const repoItems = document.querySelectorAll('li[itemprop="owns"]') || 
                          document.querySelectorAll('#user-repositories-list li');
        
        repoItems.forEach(item => {
            const nameEl = item.querySelector('a[itemprop="name codeRepository"]') || 
                           item.querySelector('h3 a');
            if (!nameEl) return;

            const name = nameEl.textContent.trim();
            const url = nameEl.href;

            const descEl = item.querySelector('p[itemprop="description"]');
            const description = descEl ? descEl.textContent.trim() : 'No description available';

            const langEl = item.querySelector('span[itemprop="programmingLanguage"]');
            const languages = langEl ? [langEl.textContent.trim()] : [];

            // Fetch stars
            let stars = 0;
            const starEl = item.querySelector('a[href$="/stargazers"]');
            if (starEl) {
                const starText = starEl.textContent.trim().replace(/,/g, '');
                stars = parseInt(starText, 10) || 0;
            }

            projects.push({
                name,
                description,
                languages,
                stars,
                url
            });
        });

        // Extract top languages based on projects list
        const languageCounts = {};
        projects.forEach(proj => {
            proj.languages.forEach(lang => {
                languageCounts[lang] = (languageCounts[lang] || 0) + 1;
            });
        });
        const topLanguages = Object.entries(languageCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([lang]) => lang);

        const githubData = {
            topLanguages,
            projects,
            totalRepos: projects.length
        };

        console.log("Parsed GitHub data:", githubData);

        // Send message back
        chrome.runtime.sendMessage({
            type: "GITHUB_SCRAPED",
            success: true,
            data: githubData
        });
    } catch (e) {
        console.error("Scraper error:", e);
        chrome.runtime.sendMessage({
            type: "GITHUB_SCRAPED",
            success: false,
            error: e.message
        });
    }
})();
