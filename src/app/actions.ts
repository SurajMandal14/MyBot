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
import { db, app } from '@/lib/firebase';
import { doc, runTransaction } from 'firebase/firestore';
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth';

const API_KEY_ERROR_MESSAGE =
  'AI features require a Gemini API key. Please add `GEMINI_API_KEY=your_key` to the .env file and restart the server. You can get a key from Google AI Studio.';

type CounterType = 'invoice' | 'quotation';


// Singleton pattern for Auth to avoid re-initialization
let auth: Auth | null = null;
function getAuthClient(): Auth {
    if (auth) {
        return auth;
    }
    try {
        // Initialize Auth on first use. This will throw if the API key is invalid.
        auth = getAuth(app);
        return auth;
    } catch (error: any) {
        // Catch the specific invalid API key error and provide a helpful message.
        if (error.code === 'auth/invalid-api-key' || error.message?.includes('invalid-api-key')) {
            throw new Error("Firebase initialization failed due to an invalid API key. Please verify the NEXT_PUBLIC_FIREBASE_API_KEY in your Vercel environment variables and redeploy.");
        }
        // Re-throw any other initialization errors.
        throw error;
    }
}


/**
 * Ensures the server is authenticated with Firebase.
 * If not already signed in, it will sign in anonymously.
 * This is required to bypass Firestore security rules that block unauthenticated access.
 */
async function ensureAuthenticated() {
  // This will throw the helpful error if the API key is invalid.
  const authClient = getAuthClient();

  if (authClient.currentUser) {
    return;
  }
  try {
    await signInAnonymously(authClient);
  } catch (error) {
    console.error("Error signing in anonymously to Firebase:", error);
    // This error now specifically handles cases where anonymous sign-in is disabled.
    throw new Error("Could not authenticate with Firebase. Please ensure Anonymous sign-in is enabled in your Firebase project's Authentication settings.");
  }
}


async function getNextNumber(type: CounterType): Promise<number> {
  await ensureAuthenticated(); // Authenticate before running the transaction
  const counterRef = doc(db, 'counters', type);
  try {
    const nextNumber = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      if (!counterDoc.exists()) {
        // If the document doesn't exist, the first number will be 2000.
        transaction.set(counterRef, { value: 2000 });
        return 2000;
      }
      // Otherwise, increment the current number.
      const newNumber = (counterDoc.data().value || 1999) + 1;
      transaction.update(counterRef, { value: newNumber });
      return newNumber;
    });
    return nextNumber;
  } catch (e) {
    console.error("Firestore transaction failed: ", e);
    throw new Error(`Could not retrieve ${type} number from the database. Please ensure your Firebase project is correctly configured and Firestore is enabled.`);
  }
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
    if (error.message?.includes('API key') || error.message?.includes('database') || error.message?.includes('Firebase')) {
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
    if (error.message?.includes('API key') || error.message?.includes('database') || error.message?.includes('Firebase')) {
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
