import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { openAI } from '@genkit-ai/openai';
import { callModelWithFallback } from './model-fallback';

/**
 * Primary genkit instance using Gemini
 * Falls back to other providers if Gemini quota is exhausted
 */
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});

/**
 * Wrapper function for API calls with automatic fallback
 * Use this when you want guaranteed fallback support
 */
export async function generateContentWithFallback(prompt: string, schema?: any) {
  try {
    // Try primary Gemini API first
    return await callModelWithFallback(prompt, schema);
  } catch (error) {
    console.error('All fallback models failed:', error);
    throw error;
  }
}

/**
 * Export ai instance for use in flows
 */
export default ai;