# Multi-Provider LLM Support - Migration Guide

## ✅ What's Been Completed

1. **[llmProvider.js](file:///e:/resumex/backend/services/llmProvider.js)** - Unified LLM interface created
2. **[package.json](file:///e:/resumex/backend/package.json)** - Added `@google/generative-ai` dependency
3. **[.env.example](file:///e:/resumex/backend/.env.example)** - Updated with provider configuration

## 🔧 Manual Steps Required

### Step 1: Update server.js Imports

**At the top of `server.js` (around line 4):**

```javascript
// REPLACE:
const OpenAI = require('openai');

// WITH:
const { initializeProvider } = require('./services/llmProvider');
```

### Step 2: Update LLM Initialization

**Replace the OpenAI client initialization (around lines 16-19):**

```javascript
// REMOVE THIS:
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// ADD THIS:
let llmProvider;
try {
    const provider = process.env.LLM_PROVIDER || 'openai';
    const apiKey = provider === 'gemini' ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY;
    llmProvider = initializeProvider({ provider, apiKey });
    console.log(`✅ LLM Provider initialized: ${llmProvider.name}`);
} catch (error) {
    console.error('❌ LLM Provider initialization failed:', error.message);
    console.error('   Please check your API key in .env file');
    process.exit(1);
}
```

### Step 3: Update Resume Generation Endpoint

**In the `/api/generate-tailored-resume` endpoint (around line 224):**

```javascript
// REPLACE THIS:
const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
        {
            role: 'system',
            content: 'You are an expert resume writer specializing in ATS optimization. Always return valid JSON.'
        },
        {
            role: 'user',
            content: prompt
        }
    ],
    temperature: 0.7,
    response_format: { type: "json_object" }
});

const resumeText = completion.choices[0].message.content;
const tailoredResume = JSON.parse(resumeText);

// WITH THIS:
const result = await llmProvider.generateText(prompt, {
    temperature: 0.7,
    maxTokens: 2000,
    responseFormat: 'json',
    systemPrompt: 'You are an expert resume writer specializing in ATS optimization. Always return valid JSON.'
});

const tailoredResume = JSON.parse(result.text);
```

**And update the response metadata:**

```javascript
// REPLACE:
metadata: {
    model: completion.model,
    tokensUsed: completion.usage.total_tokens,
    pipelineSteps: [...]
}

// WITH:
metadata: {
    model: result.model,
    tokensUsed: result.tokensUsed,
    provider: result.provider,
    pipelineSteps: [...]
}
```

### Step 4: Update Cover Letter Endpoint

**In the `/api/generate-cover-letter` endpoint (if it exists, after line 280):**

```javascript
// REPLACE:
const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
        {
            role: 'system',
            content: 'You are an expert career consultant...'
        },
        {
            role: 'user',
            content: prompt
        }
    ],
    temperature: 0.8,
    max_tokens: 1000
});

const coverLetter = completion.choices[0].message.content.trim();

// WITH:
const result = await llmProvider.generateText(prompt, {
    temperature: 0.8,
    maxTokens: 1000,
    systemPrompt: 'You are an expert career consultant and cover letter writer...'
});

const coverLetter = result.text.trim();
```

**And update the response:**

```javascript
// REPLACE:
metadata: {
    model: completion.model,
    tokensUsed: completion.usage.total_tokens,
    ...
}

// WITH:
metadata: {
    model: result.model,
    tokensUsed: result.tokensUsed,
    provider: result.provider,
    ...
}
```

## 🎯 Setup Instructions

### Option 1: Using OpenAI

1. Copy `.env.example` to `.env`
2. Set:
   ```
   LLM_PROVIDER=openai
   OPENAI_API_KEY=sk-...
   OPENAI_MODEL=gpt-4o-mini
   ```

### Option 2: Using Google Gemini (FREE TIER!)

1. Get Gemini API key from: https://aistudio.google.com/app/apikey
2. Copy `.env.example` to `.env`
3. Set:
   ```
   LLM_PROVIDER=gemini
   GEMINI_API_KEY=AIza...
   GEMINI_MODEL=gemini-1.5-flash
   ```

**Gemini Free Tier:**
- ✅ 1500 requests per day
- ✅ 1 million tokens per minute
- ✅ No credit card required
- ✅ Fast models (flash is very fast)

## 📦 Install Dependencies

```bash
cd backend
npm install
```

This will install `@google/generative-ai@^0.21.0`.

## 🧪 Test the Setup

Start the server:

```bash
node server.js
```

Expected output:
```
✅ LLM Provider initialized: gemini  (or openai)
✅ MongoDB connected successfully
🚀 Resume Generator API running on http://localhost:3000
```

Test the API:

```bash
curl -X POST http://localhost:3000/api/generate-tailored-resume \
  -H "Content-Type: application/json" \
  -d '{
    "jobDescription": "Looking for a software engineer...",
    "githubUsername": "octocat"
  }'
```

Check the response includes `"provider": "gemini"` (or `"openai"`).

## ❓ Troubleshooting

**Error: "LLM Provider initialization failed"**
- Check your API key in `.env`
- Verify `LLM_PROVIDER` matches your chosen provider
- For Gemini, ensure you're using the correct key format (starts with `AIza`)

**Error: "Gemini API key is required"**
- Set `GEMINI_API_KEY` in `.env`
- Make sure `.env` file is in the `backend/` directory

**Error: "Failed to parse AI response"**
- Gemini may need a few retries for JSON formatting
- Consider adding retry logic or using `gemini-1.5-pro` for better JSON compliance

## 🌟 Benefits

✅ **Cost Savings** - Gemini free tier vs OpenAI paid  
✅ **Flexibility** - Switch providers without code changes  
✅ **Performance** - Gemini Flash is extremely fast  
✅ **Reliability** - Fallback options if one provider has issues

## 🔄 Switching Providers

Just change `.env`:

```
LLM_PROVIDER=gemini  # or openai
```

Restart the server. No code changes needed!
