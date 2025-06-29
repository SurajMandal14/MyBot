// src/ai/flows/handle-invoice-modifications.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for handling document modifications based on user commands.
 *
 * - handleInvoiceModifications - A function that processes user commands to add, remove, or update document line items.
 * - HandleInvoiceModificationsInput - The input type for the handleInvoiceModifications function.
 * - HandleInvoiceModificationsOutput - The return type for the handleInvoiceModifications function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const HandleInvoiceModificationsInputSchema = z.object({
  documentDetails: z.string().describe('The current document details (invoice or quotation), either as a JSON string or a human-readable summary.'),
  modificationRequest: z.string().describe('The user\'s request to modify the document, e.g., "add 2 wiper blades for 500 each" or "remove engine oil".'),
});

export type HandleInvoiceModificationsInput = z.infer<typeof HandleInvoiceModificationsInputSchema>;

const HandleInvoiceModificationsOutputSchema = z.object({
  modifiedInvoiceDetails: z.string().describe('The modified document details after applying the command. This must be a valid JSON string.'),
  success: z.boolean().describe('Indicates whether the modification was successful.'),
  message: z.string().describe('A message providing feedback on the modification attempt.'),
});

export type HandleInvoiceModificationsOutput = z.infer<typeof HandleInvoiceModificationsOutputSchema>;

export async function handleInvoiceModifications(input: HandleInvoiceModificationsInput): Promise<HandleInvoiceModificationsOutput> {
  return handleInvoiceModificationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'handleInvoiceModificationsPrompt',
  input: {schema: HandleInvoiceModificationsInputSchema},
  output: {schema: HandleInvoiceModificationsOutputSchema},
  prompt: `You are an AI assistant that helps modify document details (invoice or quotation) based on a user's natural language request.

The user will provide the current document details (which could be a JSON object string, or a human-readable text summary) and a modification request.

Your task is to understand the modification request (which could be to add, remove, or update one or more line items) and apply it to the document details.

The final, modified document must be returned as a JSON string in the 'modifiedInvoiceDetails' field.

This JSON string MUST preserve the structure of the original document. It will generally look like this:
{
  "invoiceNumber" or "quotationNumber": string,
  "vehicleNumber": string,
  "customerName": string,
  "carModel": string,
  "items": [
    {
      "description": string,
      "quantity": number (optional),
      "unitPrice": number (optional),
      "total": number
    }
  ]
}
Recalculate totals if necessary. Ensure all numbers in the final JSON are just numbers, not strings. The key 'invoiceNumber' or 'quotationNumber' MUST match what was in the original details.

Current Document Details:
{{{documentDetails}}}

User's Modification Request:
{{{modificationRequest}}}

Respond with the full output object, including the 'success' flag and a 'message' describing the action taken (e.g., "Successfully added 2 wiper blades.").`,
});

const handleInvoiceModificationsFlow = ai.defineFlow(
  {
    name: 'handleInvoiceModificationsFlow',
    inputSchema: HandleInvoiceModificationsInputSchema,
    outputSchema: HandleInvoiceModificationsOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input);
      if (!output) {
        throw new Error('Failed to modify document details.');
      }
      // Validate that the output is actually a parsable JSON
      JSON.parse(output.modifiedInvoiceDetails);
      return output;
    } catch (error: any) {
      console.error('Error modifying document details:', error);
      return {
        modifiedInvoiceDetails: input.documentDetails,
        success: false,
        message: `Failed to modify document details: ${error.message || 'Unknown error'}`,
      };
    }
  }
);
