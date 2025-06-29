
// src/app/api/telegram/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import TelegramBot from 'node-telegram-bot-api';
import { modifyInvoiceAction, parseInvoiceAction, parseQuotationAction } from '@/app/actions';

const token = process.env.TELEGRAM_BOT_TOKEN;
const publicUrl = process.env.PUBLIC_URL;

if (!token) {
    console.warn("TELEGRAM_BOT_TOKEN is not set. The Telegram bot will not work.");
}

if (!publicUrl) {
    console.warn("PUBLIC_URL is not set. PDF link generation from the bot will not work.");
}

const bot = token ? new TelegramBot(token, { polling: false }) : null;

async function generateInvoiceReply(invoiceData: any, title: string) {
    const { customerName, vehicleNumber, carModel, items, invoiceNumber } = invoiceData;

    let responseText = `*${title}*:\n\n`;
    responseText += `*Invoice Number:* ${invoiceNumber}\n\n`;
    responseText += `*Customer:* ${customerName}\n`;
    responseText += `*Vehicle:* ${vehicleNumber}\n`;
    responseText += `*Model:* ${carModel}\n\n`;
    responseText += `*Items*:\n`;

    let totalAmount = 0;
    if (Array.isArray(items)) {
        items.forEach((item: any) => {
            const description = item.description || 'N/A';
            const total = item.total || 0;
            responseText += `- ${description}: ${total}\n`;
            totalAmount += total;
        });
    }

    responseText += `\n*Grand Total:* ${totalAmount.toFixed(2)}`;
    
    const replyOptions: TelegramBot.SendMessageOptions = {
        parse_mode: 'Markdown'
    };

    if (publicUrl) {
        const jsonData = JSON.stringify(invoiceData);
        const base64Data = Buffer.from(jsonData).toString('base64');
        const invoiceUrl = `${publicUrl}/view-invoice?data=${base64Data}`;

        replyOptions.reply_markup = {
            inline_keyboard: [
                [{ text: '📄 View and Print PDF', url: invoiceUrl }]
            ]
        };
    } else {
        responseText += `\n\n(Set the PUBLIC_URL environment variable to enable PDF link generation)`;
    }

    responseText += `\n\n(To make changes, simply reply to this message with your request, e.g., "remove engine oil")`;

    return { responseText, replyOptions };
}


async function generateQuotationReply(quotationData: any, title: string) {
    const { customerName, vehicleNumber, carModel, items, quotationNumber } = quotationData;

    let responseText = `*${title}*:\n\n`;
    responseText += `*Quotation Number:* ${quotationNumber}\n\n`;
    responseText += `*Customer:* ${customerName}\n`;
    responseText += `*Vehicle:* ${vehicleNumber}\n`;
    responseText += `*Model:* ${carModel}\n\n`;
    responseText += `*Items*:\n`;

    let totalAmount = 0;
    if (Array.isArray(items)) {
        items.forEach((item: any) => {
            const description = item.description || 'N/A';
            const total = item.total || 0;
            responseText += `- ${description}: ${total}\n`;
            totalAmount += total;
        });
    }


    responseText += `\n*Estimated Total:* ${totalAmount.toFixed(2)}`;
    
    const replyOptions: TelegramBot.SendMessageOptions = {
        parse_mode: 'Markdown'
    };

    if (publicUrl) {
        const jsonData = JSON.stringify(quotationData);
        const base64Data = Buffer.from(jsonData).toString('base64');
        const quotationUrl = `${publicUrl}/view-quotation?data=${base64Data}`;

        replyOptions.reply_markup = {
            inline_keyboard: [
                [{ text: '📄 View and Print PDF', url: quotationUrl }]
            ]
        };
    } else {
        responseText += `\n\n(Set the PUBLIC_URL environment variable to enable PDF link generation)`;
    }

    return { responseText, replyOptions };
}


export async function POST(req: NextRequest) {
    if (!bot) {
        console.error("WEBHOOK_ERROR: Bot not initialized. TELEGRAM_BOT_TOKEN likely missing in Vercel environment variables.");
        return NextResponse.json({ error: 'Telegram bot not configured.' }, { status: 500 });
    }
    
    console.log("INFO: Webhook received a request.");

    try {
        const body = await req.json();
        console.log("INFO: Request body parsed:", JSON.stringify(body, null, 2));

        const message = body.message;

        if (!message || !message.text) {
            console.log("INFO: No message text found in body. Ignoring.");
            return NextResponse.json({ status: 'ok' });
        }
        
        const chatId = message.chat.id;
        const text = message.text;
        console.log(`INFO: Processing message "${text}" for chat ID: ${chatId}`);

        if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
            console.error("WEBHOOK_ERROR: Gemini API key is missing on the server.");
            await bot.sendMessage(chatId, "The bot is not configured correctly. The Gemini API key is missing on the server. Please add it to your Vercel environment variables.");
            return NextResponse.json({ error: 'Gemini API key not configured.' }, { status: 500 });
        }

        const isReplyToBot = message.reply_to_message && message.reply_to_message.from.is_bot;
        const replyText = message.reply_to_message?.text || '';
        
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
        
        // Handle document modifications
        if (isReplyToBot && (replyText.includes('Invoice Number:') || replyText.includes('Quotation Number:'))) {
            console.log("INFO: Detected a reply to a document. Processing as modification.");
            const processingMessage = await bot.sendMessage(chatId, 'Applying your changes, please wait...');

            try {
                const result = await modifyInvoiceAction({
                    documentDetails: replyText,
                    modificationRequest: text,
                });

                if (result.success && result.data) {
                    console.log("INFO: Modification successful. Generating new reply.");
                    const modifiedData = result.data as any;

                    const isInvoice = 'invoiceNumber' in modifiedData;
                    const { responseText, replyOptions } = isInvoice
                        ? await generateInvoiceReply(modifiedData, "Invoice Details Updated")
                        : await generateQuotationReply(modifiedData, "Quotation Details Updated");
                    
                    await bot.editMessageText(responseText, { chat_id: chatId, message_id: processingMessage.message_id, ...replyOptions });
                } else {
                    console.error(`ERROR: Modification failed for chat ID ${chatId}:`, result.message);
                    await bot.editMessageText(`Sorry, I couldn't apply that change. Error: ${result.message}`, { chat_id: chatId, message_id: processingMessage.message_id });
                }
            } catch (error: any) {
                console.error(`FATAL: Unhandled error during modification for chat ID ${chatId}:`, error);
                await bot.editMessageText(`A critical error occurred while modifying the document. Please try again.`, { chat_id: chatId, message_id: processingMessage.message_id });
            }
            return NextResponse.json({ status: 'ok' });
        }
        
        // Fallback to parsing the text as a new document
        const parsingMessage = await bot.sendMessage(chatId, 'Parsing your text, please wait...');
        const isQuotation = text.toLowerCase().includes('quote') || text.toLowerCase().includes('quotation');

        try {
            if (isQuotation) {
                console.log("INFO: Parsing as quotation.");
                const result = await parseQuotationAction({ text });
                 if (result.success && result.data) {
                    const { customerName, vehicleNumber, carModel } = result.data;
                    
                    const missingFields = [];
                    if (!customerName?.trim()) missingFields.push('Customer Name');
                    if (!vehicleNumber?.trim()) missingFields.push('Vehicle Number');
                    if (!carModel?.trim()) missingFields.push('Car Model');

                    if (missingFields.length > 0) {
                        const missingFieldsText = missingFields.map(f => `*${f}*`).join(', ');
                        const responseText = `I've parsed the quotation, but I'm missing some essential details: ${missingFieldsText}.\n\nPlease send the notes again, including the missing information.`;
                        
                        await bot.editMessageText(responseText, { chat_id: chatId, message_id: parsingMessage.message_id, parse_mode: 'Markdown' });
                    } else {
                        const { responseText, replyOptions } = await generateQuotationReply(result.data, "Quotation Details Parsed Successfully");
                        await bot.editMessageText(responseText, { chat_id: chatId, message_id: parsingMessage.message_id, ...replyOptions });
                    }
                 } else {
                      await bot.editMessageText(`Sorry, I couldn't parse that as a quotation. Error: ${result.error}`, { chat_id: chatId, message_id: parsingMessage.message_id });
                 }
            } else {
                console.log("INFO: Parsing as invoice.");
                const result = await parseInvoiceAction({ text });
                if (result.success && result.data) {
                    const { customerName, vehicleNumber, carModel } = result.data;
                    
                    const missingFields = [];
                    if (!customerName?.trim()) missingFields.push('Customer Name');
                    if (!vehicleNumber?.trim()) missingFields.push('Vehicle Number');
                    if (!carModel?.trim()) missingFields.push('Car Model');

                    if (missingFields.length > 0) {
                        const missingFieldsText = missingFields.map(f => `*${f}*`).join(', ');
                        const responseText = `I've parsed what I could, but I'm missing some essential details: ${missingFieldsText}.\n\nPlease send your service notes again, including the missing information.`;
                        
                        await bot.editMessageText(responseText, { chat_id: chatId, message_id: parsingMessage.message_id, parse_mode: 'Markdown' });
                    } else {
                        const { responseText, replyOptions } = await generateInvoiceReply(result.data, "Invoice Details Parsed Successfully");
                        await bot.editMessageText(responseText, { chat_id: chatId, message_id: parsingMessage.message_id, ...replyOptions });
                    }
                } else {
                    await bot.editMessageText(`Sorry, I couldn't parse that. Error: ${result.error}`, { chat_id: chatId, message_id: parsingMessage.message_id });
                }
            }
        } catch(error: any) {
            console.error(`FATAL: Unhandled error during parsing for chat ID ${chatId}:`, error);
            await bot.editMessageText(`A critical error occurred while parsing your notes. Please try again.`, { chat_id: chatId, message_id: parsingMessage.message_id });
        }
        
        console.log(`INFO: Finished processing request for chat ID: ${chatId}`);
        return NextResponse.json({ status: 'ok' });

    } catch (error: any) {
        console.error('FATAL: Unhandled error in webhook processing:', error);
        // We can't guarantee a chat ID is available here, so we just log and return.
        return NextResponse.json({ error: 'Failed to process update' }, { status: 500 });
    }
}
