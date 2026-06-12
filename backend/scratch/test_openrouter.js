require('dotenv').config({ override: true });
const OpenAI = require('openai');

const apiKey = process.env.OPENROUTER_API_KEY;
console.log("Using API Key:", apiKey ? apiKey.substring(0, 15) + "..." : "undefined");
console.log("Using Model from Env:", process.env.OPENROUTER_MODEL);

const client = new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
        'HTTP-Referer': 'https://github.com/SaadHaider01/resumex',
        'X-Title': 'ResumeX',
    }
});

async function run() {
    const models = [
        process.env.OPENROUTER_MODEL,
        'google/gemini-2.0-flash-lite:free',
        'google/gemini-2.0-flash-lite-preview-02-05:free',
        'meta-llama/llama-3.3-70b-instruct:free'
    ];

    for (const model of models) {
        if (!model) continue;
        console.log(`\n--- Testing Model: ${model} ---`);
        try {
            const completion = await client.chat.completions.create({
                model: model,
                messages: [
                    { role: 'user', content: 'Say hello!' }
                ],
                max_tokens: 50
            });
            console.log("Success! Response:");
            console.log(completion.choices[0]?.message?.content);
        } catch (e) {
            console.error(`Failed: ${e.message}`);
        }
    }
}

run();
