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
  prompt: `You are an AI assistant that modifies a JSON document based on a user's request.

The user will provide the current document details as a JSON string and a modification request in natural language.

Your task is to intelligently update the JSON based on the user's request.
- The request could be to add, remove, or update line items in the 'items' array.
- The request could also be to add or update top-level fields like 'customerName', 'vehicleNumber', or 'carModel', especially if they are empty or need correction.
- Recalculate totals if necessary.
- The 'invoiceNumber' or 'quotationNumber' key and its value MUST be preserved from the original document.

Current Document Details (JSON):
{{{documentDetails}}}

User's Modification Request:
{{{modificationRequest}}}

Respond with the full output object, including the 'success' flag, a 'message' describing the action taken, and the complete, updated JSON document in the 'modifiedInvoiceDetails' field.`,
});

const handleInvoiceModificationsFlow = ai.defineFlow(
  {
    name: 'handleInvoiceModificationsFlow',
    inputSchema: HandleInvoiceModificationsInputSchema,
    outputSchema: HandleInvoiceModificationsOutputSchema,
    models: ['google-primary/gemini-2.0-flash', 'google-secondary/gemini-2.0-flash'],
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
