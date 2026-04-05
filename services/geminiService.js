const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getAIResponse = async (systemPrompt, userMessage) => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContent(userMessage || "Hello");
    const responseText = result.response.text();

    return responseText;
  } catch (error) {
    console.error("Gemini Service Error:", error.message);

    return " Sorry, I'm experiencing some technical difficulties right now.";
  }
};

module.exports = { getAIResponse };
