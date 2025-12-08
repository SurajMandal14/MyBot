// src/ai/flows/parse-quotation-details.ts
'use server';

/**
 * @fileOverview Parses quotation details from free-form text using GenAI.
 *
 * - parseQuotationDetails - A function that parses quotation details from text.
 * - ParseQuotationDetailsInput - The input type for the parseQuotationDetails function.
 * - ParseQuotationDetailsOutput - The return type for the parseQuotationDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { callModelWithFallback } from '@/ai/model-fallback';

const ParseQuotationDetailsInputSchema = z.object({
  text: z
    .string()
    .describe('The free-form text describing vehicle service details in English or Telugu for a quotation.'),
});

export type ParseQuotationDetailsInput = z.infer<typeof ParseQuotationDetailsInputSchema>;

const ParseQuotationDetailsOutputSchema = z.object({
  vehicleNumber: z.string().describe('The vehicle number.'),
  customerName: z.string().describe('The customer name.'),
  carModel: z.string().describe('The car model.'),
  items:
    z.array(
      z.object({
        description: z.string().describe('The item description.'),
        unitPrice: z.number().describe('The unit price of the item.'),
        quantity: z.number().describe('The quantity of the item.'),
        total: z.number().describe('The total price of the item.'),
      })
    )
      .describe('The list of items with their details.'),
});

export type ParseQuotationDetailsOutput = z.infer<typeof ParseQuotationDetailsOutputSchema>;


export async function parseQuotationDetails(input: ParseQuotationDetailsInput): Promise<ParseQuotationDetailsOutput> {
  return parseQuotationDetailsFlow(input);
}

const parseQuotationDetailsPrompt = ai.definePrompt({
  name: 'parseQuotationDetailsPrompt',
  input: {schema: ParseQuotationDetailsInputSchema},
  output: {schema: ParseQuotationDetailsOutputSchema},
  prompt: `You are a helpful assistant that extracts vehicle service details from text to create a QUOTATION, supporting both English and Telugu.

  Your most important task is to preserve the item descriptions exactly as they are written, without correcting spelling or expanding abbreviations. For example, if the user enters "oilfltr" or "brak pads", you must output "oilfltr" or "brak pads" exactly.

  Do NOT expand these specific shortcuts: "r&r", "Lh rh", "Fr rr", "Strng". Keep them as they are.

  The text will contain information about vehicle service, and you should extract the following information:
  - vehicleNumber: The vehicle number.
  - customerName: The customer name.
  - carModel: The car model.
  - items: A list of items with their description, unit price, quantity, and total price.

  Here is the text to extract the information from:
  {{text}}
  
  Make sure the output is in the JSON format as described in the output schema. This is for a quotation, not a final invoice. If a field is not found, leave it blank. Output the item prices as numbers. Ensure you can understand text in both English and Telugu.
  `,
});

/**
 * Flow with automatic fallback to alternative APIs if Gemini quota is exhausted
 */
const parseQuotationDetailsFlow = ai.defineFlow(
  {
    name: 'parseQuotationDetailsFlow',
    inputSchema: ParseQuotationDetailsInputSchema,
    outputSchema: ParseQuotationDetailsOutputSchema,
  },
  async input => {
    try {
      // Try primary Genkit/Gemini flow first
      const {output} = await parseQuotationDetailsPrompt(input);
      return output!;
    } catch (error) {
      // If Gemini fails (quota exhausted, etc), try fallback APIs
      console.warn('Primary Gemini API failed, attempting fallback...', error);
      
      const prompt = `You are a helpful assistant that extracts vehicle service details from text to create a QUOTATION, supporting both English and Telugu.
  
  Your most important task is to preserve the item descriptions exactly as they are written, without correcting spelling or expanding abbreviations.
  Do NOT expand these shortcuts: "r&r", "Lh rh", "Fr rr", "Strng". Keep them as they are.
  
  Extract and return ONLY a valid JSON object with these fields:
  - vehicleNumber: string
  - customerName: string
  - carModel: string
  - items: array of {description, unitPrice, quantity, total}
  
  Text to extract:
  ${input.text}`;

      try {
        const response = await callModelWithFallback(prompt);
        
        // Parse JSON from response
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log(
            `Successfully parsed using fallback API: ${response.provider}/${response.model}`
          );
          return parsed as ParseQuotationDetailsOutput;
        }
        
        throw new Error('Could not extract JSON from fallback response');
      } catch (fallbackError) {
        console.error('Fallback API also failed:', fallbackError);
        throw new Error(
          `Failed to parse quotation details - both primary and fallback APIs failed: ${error}`
        );
      }
    }
  }
);
