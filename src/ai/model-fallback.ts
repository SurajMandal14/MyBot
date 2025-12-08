/**
 * @fileOverview API Model Fallback Manager
 * Provides fallback mechanism for LLM APIs when rate limits or quota exhaustion occurs.
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
  
  // Model configuration in order of preference
  const modelConfigs: ModelConfig[] = [
    {
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      apiKey: process.env.GEMINI_API_KEY || '',
    },
    {
      provider: 'gemini',
      model: 'gemini-1.5-pro',
      apiKey: process.env.GEMINI_API_KEY_SECONDARY || '',
    },
    {
      provider: 'openai',
      model: 'gpt-4-turbo',
      apiKey: process.env.OPENAI_API_KEY || '',
    },
    {
      provider: 'openrouter',
      model: 'openai/gpt-4-turbo',
      apiKey: process.env.OPENROUTER_API_KEY || '',
    },
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
    schema?: any
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
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      }
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
    schema?: any
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
        temperature: 0.7,
        max_tokens: 2048,
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
    schema?: any
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
        temperature: 0.7,
        max_tokens: 2048,
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
    schema?: any
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
        temperature: 0.7,
        max_tokens: 2048,
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
  async function callModel(config: ModelConfig, prompt: string, schema?: any): Promise<string> {
    switch (config.provider) {
      case 'gemini':
        return callGemini(config.model, config.apiKey, prompt, schema);
      case 'openai':
        return callOpenAI(config.model, config.apiKey, prompt, schema);
      case 'openrouter':
        return callOpenRouter(config.model, config.apiKey, prompt, schema);
      case 'grok':
        return callGrok(config.model, config.apiKey, prompt, schema);
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }
  
  /**
   * Attempts to get a response with fallback to alternative APIs
   * @param prompt The prompt to send to the model
   * @param schema Optional JSON schema for structured output
   * @returns The model response
   */
  export async function callModelWithFallback(
    prompt: string,
    schema?: any
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
        const content = await callModel(config, prompt, schema);
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
          `Failed to use ${config.provider}/${config.model}: ${errorMessage}. Trying next fallback...`
        );
        continue;
      }
    }
  
    // If all models fail, throw detailed error
    const errorSummary = errors
      .map(({ config, error }) => `${config.provider}/${config.model}: ${error}`)
      .join('\n');
  
    throw new Error(
      `All AI models failed. Please check your API keys and quota:\n${errorSummary}`
    );
  }
  
  /**
   * Gets the list of available models based on configured API keys
   */
  export function getAvailableModels(): ModelConfig[] {
    return modelConfigs.filter((config) => config.apiKey);
  }
  
  /**
   * Health check to verify which APIs are available
   */
  export async function checkModelAvailability(): Promise<
    Array<{ config: ModelConfig; available: boolean; error?: string }>
  > {
    const results = [];
  
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
        // Simple test call
        await callModel(config, 'Test', undefined);
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
  