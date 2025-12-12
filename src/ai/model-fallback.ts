/**
 * @fileOverview API Model Fallback Manager
 * Provides fallback mechanism for LLM APIs when rate limits or quota exhaustion occurs.
 * Optimized for lower cost and better use of free models.
 */

export interface ModelConfig {
  provider: 'gemini' | 'openai' | 'openrouter' | 'grok';
  model: string;
  apiKey: string;
}

export interface FallbackResponse {
  content: string;
  provider: string;
  model: string;
  success: boolean;
}

/**
 * Default generation settings.
 * You can override per-call by adding optional params later if needed.
 */
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 1024; // Lowered from 2048 to save cost

// Model configuration in order of preference (cheapest / free first)
const modelConfigs: ModelConfig[] = [
  // 1) Gemini Flash – best price/perf if you have free tier or low rate
  {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    apiKey: process.env.GEMINI_API_KEY || '',
  },

  // 2) OpenRouter free models (verify they exist in OpenRouter models page)
  // DeepSeek R1 free
  {
    provider: 'openrouter',
    model: 'deepseek/deepseek-r1:free',
    apiKey: process.env.OPENROUTER_API_KEY || '',
  },
  // DeepSeek R1 distill (Qwen 32B) free
  {
    provider: 'openrouter',
    model: 'deepseek/deepseek-r1-distill-qwen-32b:free',
    apiKey: process.env.OPENROUTER_API_KEY || '',
  },
  // LLaMA 4 Maverick free
  {
    provider: 'openrouter',
    model: 'meta-llama/llama-4-maverick:free',
    apiKey: process.env.OPENROUTER_API_KEY || '',
  },

  // 3) Other Gemini variants (still cheaper than Pro in many cases)
  {
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    apiKey: process.env.GEMINI_API_KEY || '',
  },
  {
    provider: 'gemini',
    model: 'gemini-1.5-pro',
    apiKey: process.env.GEMINI_API_KEY || '',
  },
  // Secondary Gemini project/key if you really have a separate project
  {
    provider: 'gemini',
    model: 'gemini-1.5-pro',
    apiKey: process.env.GEMINI_API_KEY_SECONDARY || '',
  },

  // 4) Gemini Pro (more expensive / powerful)
  {
    provider: 'gemini',
    model: 'gemini-2.5-pro',
    apiKey: process.env.GEMINI_API_KEY || '',
  },
  {
    provider: 'gemini',
    model: 'gemini-3-pro',
    apiKey: process.env.GEMINI_API_KEY || '',
  },

  // 5) OpenAI paid
  {
    provider: 'openai',
    model: 'gpt-4-turbo',
    apiKey: process.env.OPENAI_API_KEY || '',
  },

  // 6) OpenRouter paid / other
  {
    provider: 'openrouter',
    model: 'openai/gpt-4-turbo',
    apiKey: process.env.OPENROUTER_API_KEY || '',
  },
  {
    provider: 'openrouter',
    model: 'meta-llama/llama-3.3-70b-instruct',
    apiKey: process.env.OPENROUTER_API_KEY || '',
  },

  // 7) Grok (xAI)
  {
    provider: 'grok',
    model: 'grok-2',
    apiKey: process.env.GROK_API_KEY || '',
  },
];

/**
 * Calls Gemini API
 */
async function callGemini(
  model: string,
  apiKey: string,
  prompt: string,
  schema?: any,
  maxTokens: number = DEFAULT_MAX_TOKENS,
  temperature: number = DEFAULT_TEMPERATURE,
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
    return data.candidates[0].content.parts[0].text;
  }

  throw new Error('Invalid response from Gemini API');
}

/**
 * Calls OpenAI API
 */
async function callOpenAI(
  model: string,
  apiKey: string,
  prompt: string,
  schema?: any,
  maxTokens: number = DEFAULT_MAX_TOKENS,
  temperature: number = DEFAULT_TEMPERATURE,
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (data.choices && data.choices[0]?.message?.content) {
    return data.choices[0].message.content;
  }

  throw new Error('Invalid response from OpenAI API');
}

/**
 * Calls OpenRouter API
 */
async function callOpenRouter(
  model: string,
  apiKey: string,
  prompt: string,
  schema?: any,
  maxTokens: number = DEFAULT_MAX_TOKENS,
  temperature: number = DEFAULT_TEMPERATURE,
): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'MyBot',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (data.choices && data.choices[0]?.message?.content) {
    return data.choices[0].message.content;
  }

  throw new Error('Invalid response from OpenRouter API');
}

/**
 * Calls Grok API (via xAI)
 */
async function callGrok(
  model: string,
  apiKey: string,
  prompt: string,
  schema?: any,
  maxTokens: number = DEFAULT_MAX_TOKENS,
  temperature: number = DEFAULT_TEMPERATURE,
): Promise<string> {
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    throw new Error(`Grok API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (data.choices && data.choices[0]?.message?.content) {
    return data.choices[0].message.content;
  }

  throw new Error('Invalid response from Grok API');
}

/**
 * Calls the appropriate API based on provider
 */
async function callModel(
  config: ModelConfig,
  prompt: string,
  schema?: any,
  maxTokens: number = DEFAULT_MAX_TOKENS,
  temperature: number = DEFAULT_TEMPERATURE,
): Promise<string> {
  switch (config.provider) {
    case 'gemini':
      return callGemini(config.model, config.apiKey, prompt, schema, maxTokens, temperature);
    case 'openai':
      return callOpenAI(config.model, config.apiKey, prompt, schema, maxTokens, temperature);
    case 'openrouter':
      return callOpenRouter(config.model, config.apiKey, prompt, schema, maxTokens, temperature);
    case 'grok':
      return callGrok(config.model, config.apiKey, prompt, schema, maxTokens, temperature);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

/**
 * Attempts to get a response with fallback to alternative APIs
 * @param prompt The prompt to send to the model
 * @param schema Optional JSON schema for structured output (currently unused)
 * @param maxTokens Optional per-call max tokens override
 * @param temperature Optional per-call temperature override
 * @returns The model response
 */
export async function callModelWithFallback(
  prompt: string,
  schema?: any,
  maxTokens: number = DEFAULT_MAX_TOKENS,
  temperature: number = DEFAULT_TEMPERATURE,
): Promise<FallbackResponse> {
  const errors: Array<{ config: ModelConfig; error: string }> = [];

  for (const config of modelConfigs) {
    // Skip if API key is not configured
    if (!config.apiKey) {
      errors.push({
        config,
        error: 'API key not configured',
      });
      continue;
    }

    try {
      const content = await callModel(config, prompt, schema, maxTokens, temperature);
      return {
        content,
        provider: config.provider,
        model: config.model,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push({
        config,
        error: errorMessage,
      });
      console.warn(
        `Failed to use ${config.provider}/${config.model}: ${errorMessage}. Trying next fallback...`,
      );
      continue;
    }
  }

  // If all models fail, throw detailed error
  const errorSummary = errors
    .map(({ config, error }) => `${config.provider}/${config.model}: ${error}`)
    .join('\n');

  throw new Error(
    `All AI models failed. Please check your API keys, quotas, or network:\n${errorSummary}`,
  );
}

/**
 * Gets the list of available models based on configured API keys
 */
export function getAvailableModels(): ModelConfig[] {
  return modelConfigs.filter((config) => !!config.apiKey);
}

/**
 * Lightweight health check to verify which APIs are available.
 * Uses a tiny prompt and very low token limit to avoid burning quota.
 */
export async function checkModelAvailability(): Promise<
  Array<{ config: ModelConfig; available: boolean; error?: string }>
> {
  const results: Array<{ config: ModelConfig; available: boolean; error?: string }> = [];

  for (const config of modelConfigs) {
    if (!config.apiKey) {
      results.push({
        config,
        available: false,
        error: 'API key not configured',
      });
      continue;
    }

    try {
      // Minimal test call with very low tokens
      await callModel(
        config,
        'ping',
        undefined,
        16, // maxTokens
        0, // temperature
      );
      results.push({
        config,
        available: true,
      });
    } catch (error) {
      results.push({
        config,
        available: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}