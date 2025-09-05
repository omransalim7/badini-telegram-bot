// --- CONFIGURATION ---
// These are now read from the Render environment, which is perfect.
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Import the Telegram Bot library
const TelegramBot = require('node-telegram-bot-api');

// --- THE NEW "SUPER PROMPT" (Multilingual Version) ---
// This is the upgraded brain of your bot.
const MULTILINGUAL_BADINI_PROMPT = `
You are a master linguist and translation expert. Your primary function is to translate text from ANY source language into the Badini dialect of Kurdish (using the Arabic script) with 100% accuracy.

**YOUR PROCESS:**
1.  First, automatically identify the source language of the user's input text.
2.  Second, translate the text into perfect Badini Kurdish.

**CRITICAL RULES FOR THE BADINI TRANSLATION:**
-   You MUST use Badini vocabulary and grammar exclusively.
-   Using Sorani or other dialects is a critical failure.

**KEY VOCABULARY & GRAMMAR (Follow Strictly):**
-   For "I", ALWAYS use "ئەز". NEVER use "من".
-   For "How are you?", ALWAYS use "چاوانی؟". NEVER use "چۆنی؟".
-   For "What is your name?", ALWAYS use "ناڤێ تە چیە؟". NEVER use "ناوت چیە؟".
-   For "market", use "بازار" or "سووق".
-   For "house", use "خانی".

Provide ONLY the direct, raw, translated Badini text as your response. Do not add any extra explanations or mention the source language you detected.
`;

// --- GEMINI TRANSLATION FUNCTION ---
async function getBadiniTranslation(sourceText) {
    // Check if the API keys are available. If not, the bot can't work.
    if (!GEMINI_API_KEY) {
        console.error("Gemini API Key is missing!");
        return "Error: The bot is not configured correctly. Missing API Key.";
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;
    
    const payload = {
        contents: [{ parts: [{ text: sourceText }] }],
        systemInstruction: {
            parts: [{ text: MULTILINGUAL_BADINI_PROMPT }] // Using the new multilingual prompt!
        },
    };

    try {
        const apiResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!apiResponse.ok) {
            console.error("Gemini API Error Status:", apiResponse.status);
            const errorBody = await apiResponse.text();
            console.error("Error Body:", errorBody);
            return "Sorry, I couldn't get a translation right now.";
        }

        const result = await apiResponse.json();
        let translation = result.candidates?.[0]?.content?.parts?.[0]?.text.trim() || "Translation not available.";
        
        // Final safety check
        translation = translation.replace(/من /g, "ئەز ");
        translation = translation.replace(/چۆنی/g, "چاوانی");
        
        return translation;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return "An error occurred while translating. Please try again.";
    }
}

// --- INITIALIZE THE TELEGRAM BOT ---
if (!TELEGRAM_BOT_TOKEN) {
    console.error("FATAL: Telegram Bot Token is not provided! The bot cannot start.");
    process.exit(1); // This stops the bot if the token is missing.
}

console.log("🤖 Starting Multilingual Badini Translator Bot...");
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// --- BOT EVENT LISTENERS ---

// Listener for the /start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = "👋 سلاڤ هەر رستەك/پەیڤەك تە بفێت بوتە بكەمە كوردی بادینی بومن بهیێرە / بەز لدەمێ رستا ته گەلەك درێژ بیت دڤێت چەند چركەیەكا خول من بگری..";
    bot.sendMessage(chatId, welcomeMessage);
});

// Listener for any regular message
bot.on('message', async (msg) => {
    // Ignore messages that don't have text (like stickers or photos)
    if (!msg.text) return;

    const chatId = msg.chat.id;
    const sourceText = msg.text;

    // Ignore commands
    if (sourceText.startsWith('/')) return;

    console.log(`Received message from ${msg.from.first_name}: "${sourceText}"`);
    bot.sendChatAction(chatId, 'typing');

    const badiniTranslation = await getBadiniTranslation(sourceText);

    bot.sendMessage(chatId, badiniTranslation);
    console.log(`Sent translation: "${badiniTranslation}"`);
});

console.log("✅ Bot is running and listening for messages!");

