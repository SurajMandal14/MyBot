// src/app/api/telegram/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import TelegramBot from 'node-telegram-bot-api';
import { modifyInvoiceAction, parseInvoiceAction, parseQuotationAction, parseReceiptAction } from '@/app/actions';
import pako from 'pako';

export const dynamic = 'force-dynamic';

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
    console.warn("TELEGRAM_BOT_TOKEN is not set. The Telegram bot will not work.");
}

const bot = token ? new TelegramBot(token, { polling: false }) : null;

async function generateInvoiceReply(invoiceData: any, publicUrl: string) {
    try {
        if (!publicUrl) {
            console.error(`FATAL: publicUrl was not provided to generateInvoiceReply. The bot cannot generate PDF links.`);
            const responseText = "🔴 Configuration Error: The bot's public URL could not be determined on the server. PDF link generation is disabled.";
            return { responseText, replyOptions: {} };
        }

        let responseText = `Your invoice has been created successfully.\n\nClick the button below to view, print, or save as a PDF.`;
        
        const jsonData = JSON.stringify(invoiceData);
        const compressedData = pako.deflate(jsonData, { level: 9 });
        const base64Data = Buffer.from(compressedData).toString('base64url');
        const invoiceUrl = `${publicUrl.replace(/\/$/, '')}/view-invoice?data=${base64Data}`;

        const replyOptions: TelegramBot.SendMessageOptions = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📄 View and Print Invoice', url: invoiceUrl }]
                ]
            }
        };
        
        responseText += `\n\n*To make changes, reply to this message with your request (e.g., "remove engine oil" or "add 2 wiper blades for 500 each").*`;

        return { responseText, replyOptions };
    } catch(error: any) {
        console.error(`ERROR: Failed to generate invoice reply link. Data might be malformed.`, error);
        const responseText = `Your invoice was parsed, but an internal error occurred while creating the PDF link. Please check the server logs for details.`;
        return { responseText, replyOptions: {} };
    }
}

async function generateQuotationReply(quotationData: any, publicUrl: string) {
    try {
        if (!publicUrl) {
            console.error(`FATAL: publicUrl was not provided to generateQuotationReply. The bot cannot generate PDF links.`);
            const responseText = "🔴 Configuration Error: The bot's public URL could not be determined on the server. PDF link generation is disabled.";
            return { responseText, replyOptions: {} };
        }
        
        let responseText = `Your quotation has been created successfully.\n\nClick the button below to view, print, or save as a PDF.`;

        const jsonData = JSON.stringify(quotationData);
        const compressedData = pako.deflate(jsonData, { level: 9 });
        const base64Data = Buffer.from(compressedData).toString('base64url');
        const quotationUrl = `${publicUrl.replace(/\/$/, '')}/view-quotation?data=${base64Data}`;

        const replyOptions: TelegramBot.SendMessageOptions = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📄 View and Print Quotation', url: quotationUrl }]
                ]
            }
        };
        
        responseText += `\n\n*To make changes, reply to this message with your request (e.g., "add front bumper for 2500" or "remove engine oil").*`;

        return { responseText, replyOptions };
    } catch(error: any) {
        console.error(`ERROR: Failed to generate quotation reply link. Data might be malformed.`, error);
        const responseText = `Your quotation was parsed, but an internal error occurred while creating the PDF link. Please check the server logs for details.`;
        return { responseText, replyOptions: {} };
    }
}

async function generateReceiptReply(receiptData: any, publicUrl: string) {
    try {
        if (!publicUrl) {
            console.error(`FATAL: publicUrl was not provided to generateReceiptReply. The bot cannot generate PDF links.`);
            const responseText = "🔴 Configuration Error: The bot's public URL could not be determined on the server. PDF link generation is disabled.";
            return { responseText, replyOptions: {} };
        }
        
        let responseText = `Your receipt has been created successfully.\n\nClick the button below to view, print, or save as a PDF.`;

        const jsonData = JSON.stringify(receiptData);
        const compressedData = pako.deflate(jsonData, { level: 9 });
        const base64Data = Buffer.from(compressedData).toString('base64url');
        const receiptUrl = `${publicUrl.replace(/\/$/, '')}/view-receipt?data=${base64Data}`;

        const replyOptions: TelegramBot.SendMessageOptions = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📄 View and Print Receipt', url: receiptUrl }]
                ]
            }
        };
        
        responseText += `\n\n*To make changes, reply to this message with your request (e.g., "add service charge 100").*`;

        return { responseText, replyOptions };
    } catch(error: any) {
        console.error(`ERROR: Failed to generate receipt reply link. Data might be malformed.`, error);
        const responseText = `Your receipt was parsed, but an internal error occurred while creating the PDF link. Please check the server logs for details.`;
        return { responseText, replyOptions: {} };
    }
}


// This function handles the main parsing logic for both invoices and quotations
async function handleNewDocumentRequest(chatId: number, text: string, messageId: number, publicUrl: string) {
    if (!bot) return; // Exit if bot is not initialized

    const lowerCaseText = text.toLowerCase();
    const isQuotation = lowerCaseText.startsWith('quote');
    const isInvoice = lowerCaseText.startsWith('invoice');
    const isReceipt = lowerCaseText.startsWith('receipt');

    // If the message doesn't start with a valid keyword, guide the user to restart.
    if (!isQuotation && !isInvoice && !isReceipt) {
        await bot.sendMessage(chatId, "I'm not sure how to handle that. To create a new document, please use the /start command and follow the instructions.");
        return;
    }

    const docType = isQuotation ? 'Quotation' : isInvoice ? 'Invoice' : 'Receipt';
    
    const parsingMessage = await bot.sendMessage(chatId, `Parsing your text as a ${docType}, please wait...`);

    // Strip the keyword from the text before sending to AI for cleaner parsing.
    const textForParsing = text.replace(/^(invoice|quote|receipt)\s*/i, '');
    
    // Check if there is any content left after stripping the keyword.
    if (!textForParsing.trim()) {
        await bot.editMessageText(`Please provide some notes after the "${docType.toLowerCase()}" keyword.`, { chat_id: chatId, message_id: parsingMessage.message_id });
        return;
    }

    try {
        console.log(`INFO: [chatId: ${chatId}] Starting to parse ${docType} from text: "${textForParsing}"`);
        
        const action = isQuotation ? parseQuotationAction : isInvoice ? parseInvoiceAction : parseReceiptAction;
        const result = await action({ text: textForParsing });

        console.log(`INFO: [chatId: ${chatId}] AI Action Result:`, JSON.stringify(result, null, 2));

        if (!result || !result.success || !result.data) {
            const errorMessage = `Sorry, I couldn't parse that as a ${docType}. Error: ${result?.error || 'Unknown AI error'}`;
            console.error(`ERROR: [chatId: ${chatId}] Parsing failed. Reason: ${result?.error}`);
            await bot.editMessageText(errorMessage, { chat_id: chatId, message_id: parsingMessage.message_id });
            return;
        }

        const data = result.data;
        
        const missingFields = [];
        if (!data.customerName?.trim()) missingFields.push('Customer Name');
        if (!data.vehicleNumber?.trim()) missingFields.push('Vehicle Number');
        if (!data.carModel?.trim()) missingFields.push('Car Model');
        
        const hasItems = data.items && data.items.length > 0;

        if (missingFields.length > 0 && hasItems) {
            // Document is partial. Ask for more information before generating the final link.
            console.log(`INFO: [chatId: ${chatId}] Document is partial. Missing: ${missingFields.join(', ')}. Asking for info.`);
            
            const docTypeForUrl = isQuotation ? 'quotation' : isInvoice ? 'invoice' : 'receipt';
            let responseText = `I've parsed the items, but I'm missing some details: *${missingFields.join(', ')}*.\n\n*Please reply to this message with the missing information (e.g., 'Customer is John, car is a Toyota').*`;
            
            const jsonData = JSON.stringify(data);
            const compressedData = pako.deflate(jsonData, { level: 9 });
            const base64Data = Buffer.from(compressedData).toString('base64url');
            const contextUrl = `${publicUrl.replace(/\/$/, '')}/view-${docTypeForUrl}?data=${base64Data}`;

            const replyOptions: TelegramBot.SendMessageOptions = {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '📝 Context (Reply to this message to add info)', url: contextUrl }]
                    ]
                }
            };

            await bot.editMessageText(responseText, { 
                chat_id: chatId, 
                message_id: parsingMessage.message_id, 
                ...replyOptions
            });

        } else {
            // Document is complete, generate the final link.
            console.log(`INFO: [chatId: ${chatId}] Document is complete. Generating final reply.`);
            const replyGenerator = isQuotation ? generateQuotationReply : isInvoice ? generateInvoiceReply : generateReceiptReply;
            const { responseText, replyOptions } = await replyGenerator(data, publicUrl);
            
            if (Object.keys(replyOptions).length === 0) {
                 await bot.editMessageText(responseText, { chat_id: chatId, message_id: parsingMessage.message_id });
                 return;
            }

            await bot.editMessageText(responseText, { 
                chat_id: chatId, 
                message_id: parsingMessage.message_id, 
                ...replyOptions
            });
        }

    } catch (error: any) {
        console.error(`FATAL: [chatId: ${chatId}] Unhandled error during new document request.`, error);
        await bot.editMessageText(`A critical error occurred while parsing your notes. Please try again.`, { chat_id: chatId, message_id: parsingMessage.message_id });
    }
}


async function handleModificationRequest(chatId: number, modificationRequest: string, originalMessage: TelegramBot.Message, messageId: number, publicUrl: string) {
     if (!bot) return; // Exit if bot is not initialized
     const processingMessage = await bot.sendMessage(chatId, 'Applying your changes, please wait...');
     try {
         console.log(`INFO: [chatId: ${chatId}] Starting modification request on message ID ${originalMessage.message_id}.`);
         
         const inlineKeyboard = originalMessage.reply_markup?.inline_keyboard;
         if (!inlineKeyboard || !inlineKeyboard[0] || !inlineKeyboard[0][0]) {
             await bot.editMessageText("Sorry, I couldn't find the original document data to modify. Please start a new request.", { chat_id: chatId, message_id: processingMessage.message_id });
             return;
         }

         const button = inlineKeyboard[0][0];
         if (!('url' in button)) {
             await bot.editMessageText("Sorry, the original message does not contain a valid document link to modify.", { chat_id: chatId, message_id: processingMessage.message_id });
             return;
         }

         const docUrl = new URL(button.url);
         const base64Data = docUrl.searchParams.get('data');

         if (!base64Data) {
            await bot.editMessageText("Sorry, I couldn't extract the data from the document link.", { chat_id: chatId, message_id: processingMessage.message_id });
            return;
         }
         
         const base64 = base64Data.replace(/-/g, '+').replace(/_/g, '/');
         const compressedData = Buffer.from(base64, 'base64');
         const documentDetails = pako.inflate(compressedData, { to: 'string' });
         console.log(`INFO: [chatId: ${chatId}] Extracted and decompressed document details for modification.`);
         
         const result = await modifyInvoiceAction({
             documentDetails: documentDetails,
             modificationRequest: modificationRequest,
         });

         if (result.success && result.data) {
             console.log(`INFO: [chatId: ${chatId}] Modification successful. Generating new reply.`);
             const modifiedData = result.data as any;

             let replyGenerator;
             if ('invoiceNumber' in modifiedData) {
                replyGenerator = generateInvoiceReply;
             } else if ('quotationNumber' in modifiedData) {
                replyGenerator = generateQuotationReply;
             } else {
                replyGenerator = generateReceiptReply;
             }
             
             const { responseText, replyOptions } = await replyGenerator(modifiedData, publicUrl);
             await bot.editMessageText(responseText, { chat_id: chatId, message_id: processingMessage.message_id, ...replyOptions });
         } else {
             console.error(`ERROR: [chatId: ${chatId}] Modification failed:`, result.message);
             await bot.editMessageText(`Sorry, I couldn't apply that change. Error: ${result.message}`, { chat_id: chatId, message_id: processingMessage.message_id });
         }
     } catch (error: any) {
         console.error(`FATAL: [chatId: ${chatId}] Unhandled error during modification request.`, error);
        await bot.editMessageText(`A critical error occurred while modifying the document. Please try again.`, { chat_id: chatId, message_id: processingMessage.message_id });
     }
}

export async function POST(req: NextRequest) {
    if (!bot) {
        console.error("WEBHOOK_ERROR: Bot not initialized. TELEGRAM_BOT_TOKEN is likely missing.");
        return NextResponse.json({ error: 'Telegram bot not configured.' }, { status: 500 });
    }
    
    // Dynamically construct the public URL from request headers
    const host = req.headers.get('host');
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    
    if (!host) {
        console.error("WEBHOOK_ERROR: Could not determine host from request headers. This is required for link generation.");
        // We can't send a message back without a chat ID, so we just log and exit.
        return NextResponse.json({ error: 'Could not determine host' }, { status: 500 });
    }
    
    const publicUrl = `${proto}://${host}`;
    console.log(`INFO: [WEBHOOK] Dynamically constructed public URL: ${publicUrl}`);

    try {
        const body = await req.json();
        const message = body.message;

        if (!message || !message.text) {
            return NextResponse.json({ status: 'ok' });
        }
        
        const chatId = message.chat.id;
        const text = message.text as string;
        console.log(`INFO: [chatId: ${chatId}] Webhook received message: "${text}"`);

        const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (!geminiKey?.trim()) {
            console.error("WEBHOOK_ERROR: Gemini API key is missing on the server.");
            await bot.sendMessage(chatId, "The bot is not configured correctly. The Gemini API key is missing on the server.");
            return NextResponse.json({ error: 'Gemini API key not configured.' }, { status: 500 });
        }

        if (text === '/start') {
            await bot.sendMessage(chatId, 'Welcome to Flywheels Bot!\n\nTo create an invoice, start your message with the word `invoice`.\n\nTo create a quotation, start your message with the word `quote`.\n\nTo create a receipt, start your message with the word `receipt`.\n\nFor example: `invoice AP01AB1234, oil change...`', {
                parse_mode: 'Markdown'
            });
            return NextResponse.json({ status: 'ok' });
        }
        
        const isReplyToBot = message.reply_to_message && message.reply_to_message.from.is_bot;

        if (isReplyToBot) {
            await handleModificationRequest(chatId, text, message.reply_to_message, message.message_id, publicUrl);
            return NextResponse.json({ status: 'ok' });
        }
        
        await handleNewDocumentRequest(chatId, text, message.message_id, publicUrl);
        
        console.log(`INFO: [chatId: ${chatId}] Finished processing request.`);
        return NextResponse.json({ status: 'ok' });

    } catch (error: any) {
        // Use a try-catch for the final error message to avoid silent failures.
        try {
            const bodyForError = await req.json();
            const chatIdForError = bodyForError?.message?.chat?.id;
            if (chatIdForError && bot) {
                await bot.sendMessage(chatIdForError, 'A critical error occurred on the server. Please check the logs.');
            }
        } catch (e) {
             console.error(`FATAL: Unhandled error in webhook top-level processing AND could not notify user.`, e);
        }
        console.error(`FATAL: Unhandled error in webhook top-level processing.`, error);
        return NextResponse.json({ error: 'Failed to process update' }, { status: 500 });
    }
}
