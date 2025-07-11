'use server';

import {
  handleInvoiceModifications,
  HandleInvoiceModificationsInput,
} from '@/ai/flows/handle-invoice-modifications';
import {
  parseServiceDetails,
  ParseServiceDetailsInput,
  ParseServiceDetailsOutput,
} from '@/ai/flows/parse-service-details';
import {
  parseQuotationDetails,
  ParseQuotationDetailsInput,
} from '@/ai/flows/parse-quotation-details';
import {
  parseReceiptDetails,
  ParseReceiptDetailsInput,
} from '@/ai/flows/parse-receipt-details';
import { invoiceSchema, quotationSchema, receiptSchema } from '@/lib/validators';

const API_KEY_ERROR_MESSAGE =
  'AI features require a Gemini API key. Please add `GEMINI_API_KEY=your_key` to the .env file and restart the server. You can get a key from Google AI Studio.';

type CounterType = 'invoice' | 'quotation' | 'receipt';


// NOTE: Database functionality has been removed.
// The function below provides a non-sequential, time-based number as a placeholder.
// This ensures unique numbers on serverless platforms like Vercel without a database.
async function getNextNumber(type: CounterType): Promise<number> {
  // Returns a 4-digit number based on the current minute and second (e.g., 3059 for 10:30:59).
  // This is not guaranteed to be unique but has a low chance of collision.
  const now = new Date();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  console.log(`Generating ${type} number based on current time (MMSS).`);
  return parseInt(`${minutes}${seconds}`);
}

function isApiKeyMissing() {
  const geminiKey = process.env.GEMINI_API_KEY;
  const googleKey = process.env.GOOGLE_API_KEY;
  return !geminiKey?.trim() && !googleKey?.trim();
}

function hasMeaningfulData(parsedData: ParseServiceDetailsOutput): boolean {
  const isFiller = (val: string | undefined | null) =>
    !val ||
    val.trim().toLowerCase() === 'n/a' ||
    val.trim().toLowerCase() === 'not available';

  const hasCustomerData =
    !isFiller(parsedData.customerName) ||
    !isFiller(parsedData.vehicleNumber) ||
    !isFiller(parsedData.carModel);
  const hasItemData = parsedData.items && parsedData.items.length > 0;

  return hasCustomerData || hasItemData;
}

export async function parseInvoiceAction(
  input: ParseServiceDetailsInput
): Promise<{
  success: boolean;
  data: (ParseServiceDetailsOutput & {invoiceNumber: string}) | null;
  error: string | null;
}> {
  if (isApiKeyMissing()) {
    console.error(API_KEY_ERROR_MESSAGE);
    return {success: false, data: null, error: API_KEY_ERROR_MESSAGE};
  }

  try {
    const parsedData = await parseServiceDetails(input);

    if (!hasMeaningfulData(parsedData)) {
      return {
        success: false,
        data: null,
        error:
          "The provided text doesn't seem to contain any invoice details. Please provide more specific information.",
      };
    }

    // Ensure numbers are formatted correctly and handle cases where items might be missing
    const validatedItems = (parsedData.items || []).map(item => ({
      ...item,
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      total: Number(item.total) || 0,
    }));

    const invoiceNumber = (await getNextNumber('invoice')).toString();

    const dataWithInvoiceNumber = {
      ...parsedData,
      items: validatedItems,
      invoiceNumber,
    };

    // Validate the structure of the AI output
    const a = invoiceSchema.safeParse(dataWithInvoiceNumber);
    if (!a.success) {
      console.warn('AI output validation failed', a.error.issues);
    }

    return {success: true, data: dataWithInvoiceNumber, error: null};
  } catch (error: any) {
    console.error('Error parsing service details:', error);
    if (error.message?.includes('API key')) {
      return {success: false, data: null, error: error.message || API_KEY_ERROR_MESSAGE};
    }
    return {
      success: false,
      data: null,
      error: `Failed to parse details: ${error.message || 'Unknown AI error'}`,
    };
  }
}

export async function parseQuotationAction(
  input: ParseQuotationDetailsInput
): Promise<{
  success: boolean;
  data: (ParseServiceDetailsOutput & {quotationNumber: string}) | null;
  error: string | null;
}> {
  if (isApiKeyMissing()) {
    console.error(API_KEY_ERROR_MESSAGE);
    return {success: false, data: null, error: API_KEY_ERROR_MESSAGE};
  }

  try {
    const parsedData = await parseQuotationDetails(input);

    if (!hasMeaningfulData(parsedData)) {
      return {
        success: false,
        data: null,
        error:
          "The provided text doesn't seem to contain any quotation details. Please provide more specific information.",
      };
    }

    const validatedItems = (parsedData.items || []).map(item => ({
      ...item,
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      total: Number(item.total) || 0,
    }));

    const quotationNumberValue = await getNextNumber('quotation');
    const quotationNumber = `Q${quotationNumberValue}`;

    const dataWithQuotationNumber = {
      ...parsedData,
      items: validatedItems,
      quotationNumber,
    };

    const validationResult = quotationSchema.safeParse(dataWithQuotationNumber);
    if (!validationResult.success) {
      console.warn(
        'AI output validation failed for quotation',
        validationResult.error.issues
      );
    }

    return {success: true, data: dataWithQuotationNumber, error: null};
  } catch (error: any) {
    console.error('Error parsing quotation details:', error);
    if (error.message?.includes('API key')) {
      return {success: false, data: null, error: error.message || API_KEY_ERROR_MESSAGE};
    }
    return {
      success: false,
      data: null,
      error: `Failed to parse quotation: ${
        error.message || 'Unknown AI error'
      }`,
    };
  }
}

export async function parseReceiptAction(
  input: ParseReceiptDetailsInput
): Promise<{
  success: boolean;
  data: (ParseServiceDetailsOutput & { receiptNumber: string }) | null;
  error: string | null;
}> {
  if (isApiKeyMissing()) {
    console.error(API_KEY_ERROR_MESSAGE);
    return { success: false, data: null, error: API_KEY_ERROR_MESSAGE };
  }

  try {
    const parsedData = await parseReceiptDetails(input);

    if (!hasMeaningfulData(parsedData)) {
      return {
        success: false,
        data: null,
        error:
          "The provided text doesn't seem to contain any receipt details. Please provide more specific information.",
      };
    }

    const validatedItems = (parsedData.items || []).map(item => ({
      ...item,
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      total: Number(item.total) || 0,
    }));

    const receiptNumberValue = await getNextNumber('receipt');
    const receiptNumber = `R${receiptNumberValue}`;

    const dataWithReceiptNumber = {
      ...parsedData,
      items: validatedItems,
      receiptNumber,
    };
    
    const validationResult = receiptSchema.safeParse(dataWithReceiptNumber);
    if (!validationResult.success) {
      console.warn(
        'AI output validation failed for receipt',
        validationResult.error.issues
      );
    }

    return { success: true, data: dataWithReceiptNumber, error: null };
  } catch (error: any) {
    console.error('Error parsing receipt details:', error);
    if (error.message?.includes('API key')) {
      return { success: false, data: null, error: error.message || API_KEY_ERROR_MESSAGE };
    }
    return {
      success: false,
      data: null,
      error: `Failed to parse receipt: ${
        error.message || 'Unknown AI error'
      }`,
    };
  }
}


export async function modifyInvoiceAction(
  input: HandleInvoiceModificationsInput
) {
  if (isApiKeyMissing()) {
    console.error(API_KEY_ERROR_MESSAGE);
    return {success: false, data: null, message: API_KEY_ERROR_MESSAGE};
  }

  try {
    const result = await handleInvoiceModifications(input);
    if (result.success && result.modifiedInvoiceDetails) {
      const parsedData = JSON.parse(result.modifiedInvoiceDetails);
      return {success: true, data: parsedData, message: result.message};
    }
    return {
      success: false,
      data: null,
      message: result.message || 'Failed to modify invoice.',
    };
  } catch (error: any) {
    console.error('Error modifying invoice:', error);
    if (error.message?.includes('API key')) {
      return {success: false, data: null, message: API_KEY_ERROR_MESSAGE};
    }
    return {
      success: false,
      data: null,
      message: `Failed to modify invoice: ${
        error.message || 'Unknown AI error'
      }`,
    };
  }
}
