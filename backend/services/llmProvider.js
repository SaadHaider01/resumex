/**
 * LLM Provider Abstraction Layer
 * 
 * Unified interface for multiple LLM providers (OpenAI, Gemini)
 */

const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Initialize LLM provider based on configuration
 */
function initializeProvider(config) {
    const provider = config.provider || process.env.LLM_PROVIDER || 'openai';

    if (provider === 'openai') {
        return new OpenAIProvider(config.apiKey || process.env.OPENAI_API_KEY, config.model);
    } else if (provider === 'gemini') {
        return new GeminiProvider(config.apiKey || process.env.GEMINI_API_KEY, config.model);
    } else {
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
}

/**
 * OpenAI Provider
 */
class OpenAIProvider {
    constructor(apiKey, model) {
        if (!apiKey) {
            throw new Error('OpenAI API key is required');
        }
        this.client = new OpenAI({ apiKey });
        this.name = 'openai';
        this.defaultModel = model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    }

    async generateText(prompt, options = {}) {
        const {
            temperature = 0.7,
            maxTokens = 2000,
            responseFormat = null,
            systemPrompt = 'You are a helpful assistant.'
        } = options;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
        ];

        const params = {
            model: options.model || this.defaultModel,
            messages,
            temperature,
            max_tokens: maxTokens
        };

        if (responseFormat === 'json') {
            params.response_format = { type: 'json_object' };
        }

        const completion = await this.client.chat.completions.create(params);

        return {
            text: completion.choices[0].message.content,
            model: completion.model,
            tokensUsed: completion.usage.total_tokens,
            provider: this.name
        };
    }
}

/**
 * Google Gemini Provider
 */
class GeminiProvider {
    constructor(apiKey, model) {
        if (!apiKey) {
            throw new Error('Gemini API key is required');
        }
        this.client = new GoogleGenerativeAI(apiKey);
        this.name = 'gemini';
        this.defaultModel = model || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    }

    async generateText(prompt, options = {}) {
        const {
            temperature = 0.7,
            maxTokens = 2000,
            responseFormat = null,
            systemPrompt = 'You are a helpful assistant.'
        } = options;

        const model = this.client.getGenerativeModel({
            model: options.model || this.defaultModel
        });

        // Combine system prompt with user prompt for Gemini
        const fullPrompt = `${systemPrompt}\n\n${prompt}`;

        // Add JSON instruction if needed
        const finalPrompt = responseFormat === 'json'
            ? `${fullPrompt}\n\nIMPORTANT: Return ONLY valid JSON, no additional text.`
            : fullPrompt;

        const generationConfig = {
            temperature,
            maxOutputTokens: maxTokens
        };

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
            generationConfig
        });

        const response = result.response;
        const text = response.text();

        return {
            text,
            model: this.defaultModel,
            tokensUsed: response.usageMetadata?.totalTokenCount || 0,
            provider: this.name
        };
    }
}

/**
 * Get available providers
 */
function getAvailableProviders() {
    return [
        {
            id: 'openai',
            name: 'OpenAI',
            models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
            requiresApiKey: true,
            free: false,
            notes: 'Pay-per-use, high quality'
        },
        {
            id: 'gemini',
            name: 'Google Gemini',
            models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash-exp'],
            requiresApiKey: true,
            free: true,
            notes: 'Generous free tier, fast'
        }
    ];
}

module.exports = {
    initializeProvider,
    OpenAIProvider,
    GeminiProvider,
    getAvailableProviders
};
