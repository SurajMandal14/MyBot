// src/ai/flows/parse-service-details.ts
'use server';

/**
 * @fileOverview Parses service details from free-form text using GenAI.
 *
 * - parseServiceDetails - A function that parses service details from text.
 * - ParseServiceDetailsInput - The input type for the parseServiceDetails function.
 * - ParseServiceDetailsOutput - The return type for the parseServiceDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ParseServiceDetailsInputSchema = z.object({
  text: z
    .string()
    .describe('The free-form text describing vehicle service details in English or Telugu.'),
});

export type ParseServiceDetailsInput = z.infer<typeof ParseServiceDetailsInputSchema>;

const ParseServiceDetailsOutputSchema = z.object({
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

export type ParseServiceDetailsOutput = z.infer<typeof ParseServiceDetailsOutputSchema>;

export async function parseServiceDetails(input: ParseServiceDetailsInput): Promise<ParseServiceDetailsOutput> {
  return parseServiceDetailsFlow(input);
}

const parseServiceDetailsPrompt = ai.definePrompt({
  name: 'parseServiceDetailsPrompt',
  input: {schema: ParseServiceDetailsInputSchema},
  output: {schema: ParseServiceDetailsOutputSchema},
  prompt: `You are a helpful assistant that extracts vehicle service details from text, supporting both English and Telugu. Correct any spelling mistakes and formatting issues in the extracted text to ensure it is clean and professional.

  The text will contain information about vehicle service, and you should extract the following information:
  - vehicleNumber: The vehicle number.
  - customerName: The customer name.
  - carModel: The car model.
  - items: A list of items with their description, unit price, quantity, and total price.

  Here is the text to extract the information from:
  {{text}}
  
  Make sure the output is in the JSON format as described in the output schema.  If a field is not found, leave it blank.  Output the item prices as numbers.  Ensure you can understand text in both English and Telugu.
  `,
});

const parseServiceDetailsFlow = ai.defineFlow(
  {
    name: 'parseServiceDetailsFlow',
    inputSchema: ParseServiceDetailsInputSchema,
    outputSchema: ParseServiceDetailsOutputSchema,
  },
  async input => {
    const {output} = await parseServiceDetailsPrompt(input);
    return output!;
  }
);
