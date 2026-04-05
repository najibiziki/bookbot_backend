const { getAIResponse } = require("../services/geminiService");
const { sendMessage } = require("../services/whatsappService");

async function detectLanguage(text) {
  const prompt = `
    Detect the language of this text: "${text}"
    
    Return ONLY the ISO 639-1 language code (e.g., 'en', 'fr', 'ar', 'es').
  `;

  try {
    let res = await getAIResponse(prompt, text);
    return res.trim().toLowerCase();
  } catch (e) {
    console.error("Language Detection Failed:", e.message);
    return "en";
  }
}

async function translateText(text, targetLang) {
  if (targetLang === "en") {
    return text;
  }

  const prompt = `
    Translate the following message to ${targetLang}.
    - Keep the exact same formatting, line breaks, and emojis.
    - Do not translate date/time numbers (e.g., keep "14:00" as is).
    - Keep the tone professional and friendly.
    
    Message: "${text}"
  `;

  try {
    const translatedText = await getAIResponse(prompt, text);
    return translatedText;
  } catch (e) {
    console.error("Translation Error:", e.message);

    return text;
  }
}

async function translateList(listTemplate, targetLang) {
  if (targetLang === "en") {
    return listTemplate;
  }

  const prompt = `
    Translate the following JSON data to ${targetLang}.
    - ONLY translate the "header", "body", "button", and "title"/"desc" inside "options".
    - DO NOT change the "id" fields. Keep them exactly as they are.
    - Keep numbers and currency symbols ($).
    
    JSON:
    ${JSON.stringify(listTemplate)}
    
    Return ONLY the translated JSON.
  `;

  try {
    let translatedRaw = await getAIResponse(prompt, "").then((r) =>
      r
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim(),
    );

    return JSON.parse(translatedRaw);
  } catch (e) {
    console.error("List Translation Error:", e);
    return listTemplate;
  }
}

async function sendTranslatedMessage({
  text,
  business,
  from,
  phoneId,
  session,
}) {
  const lang = session.data.lang || "en";

  const finalText = await translateText(text, lang);

  await sendMessage(phoneId, from, finalText, business.accessToken);
}

module.exports = {
  detectLanguage,
  translateText,
  sendTranslatedMessage,
  translateList,
};
