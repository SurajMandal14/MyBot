/**
 * @fileOverview Server-side utility for parsing details with fallback
 * Use this in your flows and server actions for reliable API calls
 */

import { callModelWithFallback, getErrorMessage } from './model-fallback';
import { z } from 'genkit';

interface ParseOptions {
  text: string;
  type: 'receipt' | 'quotation' | 'invoice' | 'service';
  schema: z.ZodTypeAny;
}

function getSystemPrompt(type: ParseOptions['type']): string {
  const systemPrompts = {
    receipt: `You are a helpful assistant that extracts vehicle service details from text to create a RECEIPT, supporting both English and Telugu.
    Your most important task is to preserve the item descriptions exactly as they are written, without correcting spelling or expanding abbreviations.
    Do NOT expand these shortcuts: "r&r", "Lh rh", "Fr rr", "Strng". Keep them as they are.
    Output ONLY valid JSON.`,

    quotation: `You are a helpful assistant that extracts vehicle service details from text to create a QUOTATION, supporting both English and Telugu.
    Your most important task is to preserve the item descriptions exactly as they are written, without correcting spelling or expanding abbreviations.
    Do NOT expand these shortcuts: "r&r", "Lh rh", "Fr rr", "Strng". Keep them as they are.
    Output ONLY valid JSON.`,

    invoice: `You are a helpful assistant that extracts vehicle service details from text to create an INVOICE, supporting both English and Telugu.
    Your most important task is to preserve the item descriptions exactly as they are written, without correcting spelling or expanding abbreviations.
    Do NOT expand these shortcuts: "r&r", "Lh rh", "Fr rr", "Strng". Keep them as they are.
    Output ONLY valid JSON.`,

    service: `You are a helpful assistant that extracts vehicle service details from text, supporting both English and Telugu.
    Your most important task is to preserve the item descriptions exactly as they are written, without correcting spelling or expanding abbreviations.
    Do NOT expand these shortcuts: "r&r", "Lh rh", "Fr rr", "Strng". Keep them as they are.
    Output ONLY valid JSON.`,
  };

  return systemPrompts[type];
}

function buildParsePrompt(type: ParseOptions['type'], text: string): string {
  return `${getSystemPrompt(type)}

Extract and return ONLY a valid JSON object with this shape:
{
  "vehicleNumber": "string",
  "customerName": "string",
  "carModel": "string",
  "items": [
    {
      "description": "string",
      "unitPrice": 0,
      "quantity": 0,
      "total": 0
    }
  ]
}

If a field is missing, return an empty string or an empty array.

Text to extract:
${text}`;
}

function stripMarkdownCodeFences(content: string): string {
  return content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function sanitizeJsonString(content: string): string {
  return content
    .replace(/^\uFEFF/, '')
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/,\s*([}\]])/g, '$1')
    .trim();
}

function parseJsonFromContent(content: string): unknown {
  const cleaned = stripMarkdownCodeFences(content);
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not extract JSON from fallback response.');
  }

  const candidates = [jsonMatch[0], sanitizeJsonString(jsonMatch[0])];
  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function repairJsonWithFallback(content: string): Promise<unknown> {
  const repairPrompt = `Repair the malformed JSON below.

Rules:
- Return ONLY valid JSON.
- Do not add markdown fences.
- Preserve the original meaning and fields.
- Keep the top-level object shape exactly as-is.
- If an item value is unclear, use an empty string or 0.

Malformed JSON:
${content}`;

  const repairedResponse = await callModelWithFallback(
    repairPrompt,
    undefined,
    2048,
    0
  );

  return parseJsonFromContent(repairedResponse.content);
}

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toNumberValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function normalizeParsedDetails(raw: any) {
  const items = Array.isArray(raw?.items) ? raw.items : [];

  return {
    vehicleNumber: toStringValue(raw?.vehicleNumber),
    customerName: toStringValue(raw?.customerName),
    carModel: toStringValue(raw?.carModel),
    items: items.map((item: any) => ({
      description: toStringValue(item?.description),
      unitPrice: toNumberValue(item?.unitPrice),
      quantity: toNumberValue(item?.quantity),
      total: toNumberValue(item?.total),
    })),
  };
}

export function buildCombinedParseFailure(
  type: ParseOptions['type'],
  primaryError: unknown,
  fallbackError: unknown
): string {
  const primaryMessage = primaryError ? getErrorMessage(primaryError) : 'Primary model was skipped.';
  const fallbackMessage = getErrorMessage(fallbackError);

  return `Failed to parse ${type} details. Primary model error: ${primaryMessage}. Fallback error: ${fallbackMessage}`;
}

/**
 * Parses details using fallback mechanism with JSON output validation
 */
export async function parseDetailsWithFallback(
  options: ParseOptions
): Promise<Record<string, any>> {
  const prompt = buildParsePrompt(options.type, options.text);

  try {
    const response = await callModelWithFallback(
      prompt,
      options.schema,
      2048,
      0
    );
    let parsed: unknown;

    try {
      parsed = parseJsonFromContent(response.content);
    } catch (parseError) {
      console.warn(
        'Fallback returned malformed JSON, attempting repair:',
        getErrorMessage(parseError)
      );
      parsed = await repairJsonWithFallback(response.content);
    }

    const normalized = normalizeParsedDetails(parsed);
    return options.schema.parse(normalized);
  } catch (error) {
    const errorMessage = getErrorMessage(error);
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
    const errorMessage = getErrorMessage(error);
    console.error('Generate with fallback failed:', errorMessage);
    throw new Error(`Failed to generate content: ${errorMessage}`);
  }
}
