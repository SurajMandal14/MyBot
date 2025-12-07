import {genkit, type Genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import {Plugin} from '@genkit-ai/core';

// This augmentation is necessary to support caching the AI instance in a hot-reload environment.
declare global {
  var __ai: Genkit;
}

let ai: Genkit;

if (!global.__ai) {
  const plugins: Plugin[] = [];
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const geminiApiKeySecondary = process.env.GEMINI_API_KEY_SECONDARY;

  if (geminiApiKey) {
    plugins.push(googleAI({name: 'google-primary', apiKey: geminiApiKey}));
  }

  if (geminiApiKeySecondary) {
    plugins.push(googleAI({name: 'google-secondary', apiKey: geminiApiKeySecondary}));
  }
  global.__ai = genkit({plugins});
}

ai = global.__ai;

export {ai};
