// Using global fetch

async function run() {
    try {
        console.log("Fetching models from OpenRouter...");
        const res = await fetch('https://openrouter.ai/api/v1/models');
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        console.log(`Total models found: ${data.data?.length}`);
        
        // Filter free models
        const freeModels = data.data.filter(model => {
            const pricing = model.pricing;
            return pricing && parseFloat(pricing.prompt) === 0 && parseFloat(pricing.completion) === 0;
        });

        console.log("\nFree Models available on OpenRouter:");
        freeModels.forEach(model => {
            console.log(`- ${model.id} (${model.name})`);
        });
    } catch (e) {
        console.error("Failed to fetch models:", e);
    }
}

run();
