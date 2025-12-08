/**
 * @fileOverview Server-side utility for parsing details with fallback
 * Use this in your flows and server actions for reliable API calls
 */

import { callModelWithFallback, FallbackResponse } from './model-fallback';
import { z } from 'genkit';

interface ParseOptions {
  text: string;
  type: 'receipt' | 'quotation' | 'invoice' | 'service';
  schema: z.ZodSchema;
}

/**
 * Parses details using fallback mechanism with JSON output validation
 */
export async function parseDetailsWithFallback(
  options: ParseOptions
): Promise<Record<string, any>> {
  const systemPrompts = {
    receipt: `You are a helpful assistant that extracts vehicle service details from text to create a RECEIPT, supporting both English and Telugu.
    Your most important task is to preserve the item descriptions exactly as they are written, without correcting spelling or expanding abbreviations.
    Do NOT expand these shortcuts: "r&r", "Lh rh", "Fr rr", "Strng". Keep them as they are.
    Output ONLY valid JSON matching the schema provided.`,
    
    quotation: `You are a helpful assistant that extracts vehicle service details from text to create a QUOTATION, supporting both English and Telugu.
    Your most important task is to preserve the item descriptions exactly as they are written, without correcting spelling or expanding abbreviations.
    Do NOT expand these shortcuts: "r&r", "Lh rh", "Fr rr", "Strng". Keep them as they are.
    Output ONLY valid JSON matching the schema provided.`,
    
    invoice: `You are a helpful assistant that extracts vehicle service details from text to create an INVOICE, supporting both English and Telugu.
    Your most important task is to preserve the item descriptions exactly as they are written, without correcting spelling or expanding abbreviations.
    Do NOT expand these shortcuts: "r&r", "Lh rh", "Fr rr", "Strng". Keep them as they are.
    Output ONLY valid JSON matching the schema provided.`,
    
    service: `You are a helpful assistant that extracts vehicle service details from text, supporting both English and Telugu.
    Your most important task is to preserve the item descriptions exactly as they are written, without correcting spelling or expanding abbreviations.
    Output ONLY valid JSON matching the schema provided.`,
  };

  const prompt = `${systemPrompts[options.type]}

Text to extract:
${options.text}

Return a valid JSON object matching this schema:
${JSON.stringify(options.schema, null, 2)}`;

  try {
    const response = await callModelWithFallback(prompt, options.schema);
    
    // Try to parse the JSON response
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          ...parsed,
          _meta: {
            provider: response.provider,
            model: response.model,
            success: true,
          },
        };
      }
    } catch (parseError) {
      console.warn('Failed to parse JSON response, returning raw:', parseError);
      return {
        raw: response.content,
        _meta: {
          provider: response.provider,
          model: response.model,
          success: false,
          parseError: parseError instanceof Error ? parseError.message : String(parseError),
        },
      };
    }

    return {
      _meta: {
        provider: response.provider,
        model: response.model,
        success: false,
        error: 'Could not extract JSON from response',
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Parse details with fallback failed:', errorMessage);
    throw new Error(`Failed to parse details: ${errorMessage}`);
  }
}

/**
 * Simpler version that just returns the raw text response
 */
export async function generateWithFallback(prompt: string): Promise<string> {
  try {
    const response = await callModelWithFallback(prompt);
    return response.content;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Generate with fallback failed:', errorMessage);
    throw new Error(`Failed to generate content: ${errorMessage}`);
  }
}
