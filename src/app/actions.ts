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
import {invoiceSchema, quotationSchema} from '@/lib/validators';
import {promises as fs} from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';

const API_KEY_ERROR_MESSAGE =
  'AI features require a Gemini API key. Please add `GEMINI_API_KEY=your_key` to the .env file and restart the server. You can get a key from Google AI Studio.';

const countersFilePath = path.join(process.cwd(), 'src', 'data', 'counters.json');
type CounterType = 'invoice' | 'quotation';

async function getNextNumber(type: CounterType): Promise<number> {
  let counters;
  try {
    const data = await fs.readFile(countersFilePath, 'utf-8');
    counters = JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is invalid, create it with initial values.
    counters = {invoice: 2000, quotation: 2000};
  }

  const currentNumber = counters[type] || (type === 'invoice' ? 2000 : 2000);
  counters[type] = currentNumber + 1;

  try {
    await fs.mkdir(path.dirname(countersFilePath), {recursive: true});
    await fs.writeFile(countersFilePath, JSON.stringify(counters, null, 2));
    // This is the crucial fix: it tells Next.js to clear any cached data,
    // forcing it to re-read the counters.json file on the next request.
    revalidatePath('/', 'layout');
  } catch (writeError) {
    console.error('Failed to write to counters file:', writeError);
  }

  return currentNumber;
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
      return {success: false, data: null, error: API_KEY_ERROR_MESSAGE};
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
      return {success: false, data: null, error: API_KEY_ERROR_MESSAGE};
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
