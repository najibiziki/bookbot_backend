const moment = require("moment-timezone");
const { getAIResponse } = require("../services/geminiService");

async function extractBookingIntent(text) {
  const currentDate = new Date().toISOString().split("T")[0];
  const currentYear = new Date().getFullYear();

  const extractionPrompt = `
    You are a date extractor.
    Current Date: ${currentDate}. Year: ${currentYear}.

    Analyze the text and extract the date and time.
    - Handle formats like "23/01", "tomorrow", "next Monday".
    - If the user writes "23/01" without a year, assume it is ${currentYear}.
    - **If no date is mentioned at all (only a time like "17:30"), assume they mean TODAY (${currentDate}).**
    - If no time is mentioned, assume null.

    Return ONLY JSON with these exact keys:
    { "date": "YYYY-MM-DD" or null, "time": "HH:mm" or null }
  `;

  try {
    let aiExtractionRaw = await getAIResponse(extractionPrompt, text);
    aiExtractionRaw = aiExtractionRaw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(aiExtractionRaw);
  } catch (e) {
    console.error("AI Error:", e.message);
    return null;
  }
}

function validateTime(date, time, timezone, now) {
  const dateTimeString = `${date} ${time}`;
  const slotMoment = moment.tz(dateTimeString, "YYYY-MM-DD HH:mm", timezone);

  if (!slotMoment.isValid()) return { valid: false, type: "INVALID_FORMAT" };
  if (slotMoment.isBefore(now)) return { valid: false, type: "PAST_DATE" };

  return { valid: true, date: slotMoment.toDate() };
}

module.exports = {
  extractBookingIntent,
  validateTime,
};
