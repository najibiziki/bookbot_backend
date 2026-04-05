const { sendTranslatedMessage, translateList } = require("../translator");
const { sendListMessage } = require("../../services/whatsappService");
const { getAIResponse } = require("../../services/geminiService");

module.exports = async function handleStaff({
  text,
  business,
  from,
  phoneId,
  session,
}) {
  const lang = session.data.lang || "en";

  let staffMatch = business.staff.find((s) => s.id === text);

  if (!staffMatch) {
    const staffList = business.staff.map((s) => s.name).join(", ");
    try {
      const prompt = `
        User said: "${text}"
        Available Staff: ${staffList}
        
        Identify which staff member they want.
        Return ONLY the exact Name.
        If unsure, return null.
      `;
      let aiRaw = await getAIResponse(prompt, text).then((r) =>
        r
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim(),
      );

      staffMatch = business.staff.find(
        (s) => s.name.toLowerCase() === aiRaw.toLowerCase(),
      );
    } catch (e) {
      console.log("AI Staff Match failed, relying on keywords");
    }
  }

  if (staffMatch) {
    session.stage = "AWAITING_DATE";
    session.data.staffId = staffMatch.id;
    session.data.staffName = staffMatch.name;

    await sendTranslatedMessage({
      text: `I am ${staffMatch.name}. When works best for you?`,
      business,
      from,
      phoneId,
      session,
    });
    return "CONTINUE";
  }

  const staffTemplate = {
    header: "Our Team",
    body: "Who would you like to book with?",
    button: "View Team",
    options: business.staff.map((s) => ({
      id: s.id,
      title: s.name,
      desc: s.description || "",
    })),
  };

  const translatedList = await translateList(staffTemplate, lang);

  await sendListMessage({
    phoneId,
    from,
    headerText: translatedList.header,
    bodyText: translatedList.body,
    buttonText: translatedList.button,
    options: translatedList.options,
    accessToken: business.accessToken,
  });

  return "CONTINUE";
};
