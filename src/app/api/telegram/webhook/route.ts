
// src/app/api/telegram/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import TelegramBot from 'node-telegram-bot-api';
import { modifyInvoiceAction, parseInvoiceAction, parseQuotationAction } from '@/app/actions';
import pako from 'pako';

const token = process.env.TELEGRAM_BOT_TOKEN;
const publicUrl = process.env.PUBLIC_URL;

if (!token) {
    console.warn("TELEGRAM_BOT_TOKEN is not set. The Telegram bot will not work.");
}

if (!publicUrl) {
    console.warn("PUBLIC_URL is not set. PDF link generation from the bot will not work.");
}

const bot = token ? new TelegramBot(token, { polling: false }) : null;

// This function sanitizes text for Telegram's MarkdownV2 parser
function escapeTelegramMarkdown(text: string): string {
    if (!text) return '';
    const escapeChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
    return text.split('').map(char => escapeChars.includes(char) ? '\\' + char : char).join('');
}

async function generateInvoiceReply(invoiceData: any) {
    let responseText = `Your invoice has been created successfully.\n\nClick the button below to view, print, or save as a PDF.`;
    
    const replyOptions: TelegramBot.SendMessageOptions = {};

    if (publicUrl) {
        const jsonData = JSON.stringify(invoiceData);
        const compressedData = pako.deflate(jsonData);
        const base64Data = Buffer.from(compressedData).toString('base64');
        const invoiceUrl = `${publicUrl}/view-invoice?data=${base64Data}`;

        replyOptions.reply_markup = {
            inline_keyboard: [
                [{ text: '📄 View and Print Invoice', url: invoiceUrl }]
            ]
        };
    } else {
        responseText += `\n\n(PDF link generation is disabled. Please set the PUBLIC_URL environment variable.)`;
    }

    responseText += `\n\n(To make changes, simply reply to this message with your request, e.g., "remove engine oil")`;

    return { responseText, replyOptions };
}

async function generateQuotationReply(quotationData: any) {
    let responseText = `Your quotation has been created successfully.\n\nClick the button below to view, print, or save as a PDF.`;
    
    const replyOptions: TelegramBot.SendMessageOptions = {};

    if (publicUrl) {
        const jsonData = JSON.stringify(quotationData);
        const compressedData = pako.deflate(jsonData);
        const base64Data = Buffer.from(compressedData).toString('base64');
        const quotationUrl = `${publicUrl}/view-quotation?data=${base64Data}`;

        replyOptions.reply_markup = {
            inline_keyboard: [
                [{ text: '📄 View and Print Quotation', url: quotationUrl }]
            ]
        };
    } else {
        responseText += `\n\n(PDF link generation is disabled. Please set the PUBLIC_URL environment variable.)`;
    }
    
    responseText += `\n\n(To make changes, simply reply to this message with your request, e.g., "add front bumper for 2500")`;

    return { responseText, replyOptions };
}


// This function handles the main parsing logic for both invoices and quotations
async function handleNewDocumentRequest(chatId: number, text: string, messageId: number) {
    const isQuotation = text.toLowerCase().includes('quote') || text.toLowerCase().includes('quotation');
    const docType = isQuotation ? 'Quotation' : 'Invoice';
    
    const parsingMessage = await bot!.sendMessage(chatId, `Parsing your text as a ${docType}, please wait...`);

    try {
        console.log(`INFO: [chatId: ${chatId}] Starting to parse ${docType} from text: "${text}"`);
        
        const action = isQuotation ? parseQuotationAction : parseInvoiceAction;
        const result = await action({ text });

        console.log(`INFO: [chatId: ${chatId}] AI Action Result:`, JSON.stringify(result, null, 2));

        if (!result || !result.success || !result.data) {
            const errorMessage = `Sorry, I couldn't parse that as a ${docType}. Error: ${result?.error || 'Unknown AI error'}`;
            console.error(`ERROR: [chatId: ${chatId}] Parsing failed. Reason: ${result?.error}`);
            await bot!.editMessageText(errorMessage, { chat_id: chatId, message_id: parsingMessage.message_id });
            return;
        }

        const data = result.data;
        const missingFields = [];
        if (!data.customerName?.trim()) missingFields.push('Customer Name');
        if (!data.vehicleNumber?.trim()) missingFields.push('Vehicle Number');
        if (!data.carModel?.trim()) missingFields.push('Car Model');
        if (!data.items || data.items.length === 0) missingFields.push('Line Items');

        if (missingFields.length > 0) {
            const missingFieldsText = missingFields.join(', ');
            const responseText = `I've parsed what I could, but I'm missing some essential details: ${missingFieldsText}.\n\nPlease send your service notes again, including the missing information.`;
            await bot!.editMessageText(responseText, { chat_id: chatId, message_id: parsingMessage.message_id });
        } else {
            console.log(`INFO: [chatId: ${chatId}] Parsing successful. Generating reply.`);
            const replyGenerator = isQuotation ? generateQuotationReply : generateInvoiceReply;
            const { responseText, replyOptions } = await replyGenerator(data);
            await bot!.editMessageText(responseText, { chat_id: chatId, message_id: parsingMessage.message_id, ...replyOptions });
        }

    } catch (error: any) {
        console.error(`FATAL: [chatId: ${chatId}] Unhandled error during new document request.`);
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        const errorStack = error instanceof Error ? error.stack : 'No stack available';
        console.error(`--> Error Message: ${errorMessage}`);
        console.error(`--> Error Stack: ${errorStack}`);
        await bot!.editMessageText(`A critical error occurred while parsing your notes. Please try again.`, { chat_id: chatId, message_id: parsingMessage.message_id });
    }
}


async function handleModificationRequest(chatId: number, modificationRequest: string, originalMessage: TelegramBot.Message, messageId: number) {
     const processingMessage = await bot!.sendMessage(chatId, 'Applying your changes, please wait...');
     try {
         console.log(`INFO: [chatId: ${chatId}] Starting modification request on message ID ${originalMessage.message_id}.`);
         
         const inlineKeyboard = originalMessage.reply_markup?.inline_keyboard;
         if (!inlineKeyboard || !inlineKeyboard[0] || !inlineKeyboard[0][0]) {
             await bot!.editMessageText("Sorry, I couldn't find the original document data to modify. Please start a new request.", { chat_id: chatId, message_id: processingMessage.message_id });
             return;
         }

         const button = inlineKeyboard[0][0];
         if (!('url' in button)) {
             await bot!.editMessageText("Sorry, the original message does not contain a valid document link to modify.", { chat_id: chatId, message_id: processingMessage.message_id });
             return;
         }

         const docUrl = new URL(button.url);
         const base64Data = docUrl.searchParams.get('data');

         if (!base64Data) {
            await bot!.editMessageText("Sorry, I couldn't extract the data from the document link.", { chat_id: chatId, message_id: processingMessage.message_id });
            return;
         }

         const compressedData = Buffer.from(base64Data, 'base64');
         const documentDetails = pako.inflate(compressedData, { to: 'string' });
         console.log(`INFO: [chatId: ${chatId}] Extracted and decompressed document details for modification.`);
         
         const result = await modifyInvoiceAction({
             documentDetails: documentDetails,
             modificationRequest: modificationRequest,
         });

         if (result.success && result.data) {
             console.log(`INFO: [chatId: ${chatId}] Modification successful. Generating new reply.`);
             const modifiedData = result.data as any;

             const isInvoice = 'invoiceNumber' in modifiedData;
             const replyGenerator = isInvoice ? generateInvoiceReply : generateQuotationReply;
             
             const { responseText, replyOptions } = await replyGenerator(modifiedData);
             await bot!.editMessageText(responseText, { chat_id: chatId, message_id: processingMessage.message_id, ...replyOptions });
         } else {
             console.error(`ERROR: [chatId: ${chatId}] Modification failed:`, result.message);
             await bot!.editMessageText(`Sorry, I couldn't apply that change. Error: ${result.message}`, { chat_id: chatId, message_id: processingMessage.message_id });
         }
     } catch (error: any) {
         console.error(`FATAL: [chatId: ${chatId}] Unhandled error during modification request.`);
         const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
         const errorStack = error instanceof Error ? error.stack : 'No stack available';
        console.error(`--> Error Message: ${errorMessage}`);
        console.error(`--> Error Stack: ${errorStack}`);
        await bot!.editMessageText(`A critical error occurred while modifying the document. Please try again.`, { chat_id: chatId, message_id: processingMessage.message_id });
     }
}

export async function POST(req: NextRequest) {
    console.log(`INFO: [WEBHOOK_INIT] PUBLIC_URL value is: "${process.env.PUBLIC_URL}"`);
    if (!bot) {
        console.error("WEBHOOK_ERROR: Bot not initialized. TELEGRAM_BOT_TOKEN is likely missing.");
        return NextResponse.json({ error: 'Telegram bot not configured.' }, { status: 500 });
    }
    
    try {
        const body = await req.json();
        const message = body.message;

        if (!message || !message.text) {
            return NextResponse.json({ status: 'ok' });
        }
        
        const chatId = message.chat.id;
        const text = message.text as string;
        console.log(`INFO: [chatId: ${chatId}] Webhook received message: "${text}"`);

        // Handle API Key check early
        const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (!geminiKey?.trim()) {
            console.error("WEBHOOK_ERROR: Gemini API key is missing on the server.");
            await bot.sendMessage(chatId, "The bot is not configured correctly. The Gemini API key is missing on the server.");
            return NextResponse.json({ error: 'Gemini API key not configured.' }, { status: 500 });
        }

        // Handle specific commands first
        if (text === '/start') {
            await bot.sendMessage(chatId, 'Welcome to Flywheels bot, select your action', {
                reply_markup: {
                    keyboard: [[{ text: 'Invoice' }, { text: 'Quotation' }]],
                    resize_keyboard: true,
                    one_time_keyboard: true,
                }
            });
            return NextResponse.json({ status: 'ok' });
        }
        
        if (text === 'Invoice') {
            await bot.sendMessage(chatId, 'Please send your service notes in a single message.');
            return NextResponse.json({ status: 'ok' });
        }

        if (text === 'Quotation') {
            await bot.sendMessage(chatId, 'Please send your service notes for the quotation in a single message.');
            return NextResponse.json({ status: 'ok' });
        }
        
        // Handle document modifications (replying to a bot message)
        const isReplyToBot = message.reply_to_message && message.reply_to_message.from.is_bot;
        const replyText = message.reply_to_message?.text || '';

        // Check if the reply is to a message that contains our call-to-action for modifications
        const isModificationReply = isReplyToBot && replyText.includes('To make changes, simply reply');
        
        if (isModificationReply) {
            await handleModificationRequest(chatId, text, message.reply_to_message, message.message_id);
            return NextResponse.json({ status: 'ok' });
        }
        
        // If not a command or reply, assume it's a new document request
        await handleNewDocumentRequest(chatId, text, message.message_id);
        
        console.log(`INFO: [chatId: ${chatId}] Finished processing request.`);
        return NextResponse.json({ status: 'ok' });

    } catch (error: any) {
        console.error(`FATAL: Unhandled error in webhook top-level processing.`);
        const errorMessage = error instanceof Error ? `${error.message} (Name: ${error.name})` : JSON.stringify(error);
        const errorStack = error instanceof Error ? error.stack : 'No stack available';
        console.error(`--> Error Message: ${errorMessage}`);
        console.error(`--> Error Stack: ${errorStack}`);
        // We might not have a chatId here if the request body is malformed.
        // We can't reliably send a message back.
        return NextResponse.json({ error: 'Failed to process update' }, { status: 500 });
    }
}
