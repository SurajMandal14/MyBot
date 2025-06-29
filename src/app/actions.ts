'use server';

import { handleInvoiceModifications, HandleInvoiceModificationsInput } from '@/ai/flows/handle-invoice-modifications';
import { parseServiceDetails, ParseServiceDetailsInput, ParseServiceDetailsOutput } from '@/ai/flows/parse-service-details';
import { parseQuotationDetails, ParseQuotationDetailsInput } from '@/ai/flows/parse-quotation-details';
import { invoiceSchema, quotationSchema } from '@/lib/validators';

const API_KEY_ERROR_MESSAGE = "AI features require a Gemini API key. Please add `GEMINI_API_KEY=your_key` to the .env file and restart the server. You can get a key from Google AI Studio.";

function isApiKeyMissing() {
    const geminiKey = process.env.GEMINI_API_KEY;
    const googleKey = process.env.GOOGLE_API_KEY;
    return !geminiKey?.trim() && !googleKey?.trim();
}

export async function parseInvoiceAction(input: ParseServiceDetailsInput): Promise<{
    success: boolean;
    data: (ParseServiceDetailsOutput & { invoiceNumber: string }) | null;
    error: string | null;
}> {
    if (isApiKeyMissing()) {
        console.error(API_KEY_ERROR_MESSAGE);
        return { success: false, data: null, error: API_KEY_ERROR_MESSAGE };
    }

    try {
        const parsedData = await parseServiceDetails(input);
        
        // Ensure numbers are formatted correctly and handle cases where items might be missing
        const validatedItems = (parsedData.items || []).map(item => ({
            ...item,
            quantity: Number(item.quantity) || 0,
            unitPrice: Number(item.unitPrice) || 0,
            total: Number(item.total) || 0,
        }));
        
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const secondsSinceDayStart = Math.floor((now.getTime() - startOfDay.getTime()) / 1000);
        const invoiceNumber = (2000 + secondsSinceDayStart).toString();
        
        const dataWithInvoiceNumber = { ...parsedData, items: validatedItems, invoiceNumber };

        // Validate the structure of the AI output
        const a = invoiceSchema.safeParse(dataWithInvoiceNumber);
        if(!a.success) {
            console.warn("AI output validation failed", a.error.issues);
        }

        return { success: true, data: dataWithInvoiceNumber, error: null };
    } catch (error: any) {
        console.error('Error parsing service details:', error);
        if (error.message?.includes('API key')) {
            return { success: false, data: null, error: API_KEY_ERROR_MESSAGE };
        }
        return { success: false, data: null, error: `Failed to parse details: ${error.message || 'Unknown AI error'}` };
    }
}

export async function parseQuotationAction(input: ParseQuotationDetailsInput): Promise<{
    success: boolean;
    data: (ParseServiceDetailsOutput & { quotationNumber: string }) | null;
    error: string | null;
}> {
    if (isApiKeyMissing()) {
        console.error(API_KEY_ERROR_MESSAGE);
        return { success: false, data: null, error: API_KEY_ERROR_MESSAGE };
    }

    try {
        const parsedData = await parseQuotationDetails(input);
        
        const validatedItems = (parsedData.items || []).map(item => ({
            ...item,
            quantity: Number(item.quantity) || 0,
            unitPrice: Number(item.unitPrice) || 0,
            total: Number(item.total) || 0,
        }));
        
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const secondsSinceDayStart = Math.floor((now.getTime() - startOfDay.getTime()) / 1000);
        const quotationNumber = `Q${2000 + secondsSinceDayStart}`;

        const dataWithQuotationNumber = { ...parsedData, items: validatedItems, quotationNumber };

        const validationResult = quotationSchema.safeParse(dataWithQuotationNumber);
        if(!validationResult.success) {
            console.warn("AI output validation failed for quotation", validationResult.error.issues);
        }

        return { success: true, data: dataWithQuotationNumber, error: null };
    } catch (error: any) {
        console.error('Error parsing quotation details:', error);
        if (error.message?.includes('API key')) {
            return { success: false, data: null, error: API_KEY_ERROR_MESSAGE };
        }
        return { success: false, data: null, error: `Failed to parse quotation: ${error.message || 'Unknown AI error'}` };
    }
}


export async function modifyInvoiceAction(input: HandleInvoiceModificationsInput) {
    if (isApiKeyMissing()) {
        console.error(API_KEY_ERROR_MESSAGE);
        return { success: false, data: null, message: API_KEY_ERROR_MESSAGE };
    }
    
    try {
        const result = await handleInvoiceModifications(input);
        if (result.success && result.modifiedInvoiceDetails) {
            const parsedData = JSON.parse(result.modifiedInvoiceDetails);
            return { success: true, data: parsedData, message: result.message };
        }
        return { success: false, data: null, message: result.message || "Failed to modify invoice." };
    }
    catch (error: any) {
        console.error('Error modifying invoice:', error);
        if (error.message?.includes('API key')) {
            return { success: false, data: null, message: API_KEY_ERROR_MESSAGE };
        }
        return { success: false, data: null, message: `Failed to modify invoice: ${error.message || 'Unknown AI error'}` };
    }
}
