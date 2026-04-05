const { extractBookingIntent } = require("../date");
const {
  sendTranslatedMessage,
  detectLanguage,
  translateList,
} = require("../translator");
const { sendListMessage } = require("../../services/whatsappService");
const { buildServiceTemplate, matchService } = require("../botHelpers");

module.exports = async function handleGreeting({
  text,
  business,
  from,
  phoneId,
  session,
  type = "greeting",
}) {
  const detectedLang = await detectLanguage(text);
  session.data.lang = detectedLang;

  const serviceMatch = await matchService(text, business);
  const bookingData = await extractBookingIntent(text);

  if (bookingData && bookingData.date && bookingData.time) {
    session.stage = "AWAITING_CONFIRMATION";
    session.data.service = serviceMatch
      ? serviceMatch.name
      : "Standard Appointment";
    session.data.duration = serviceMatch ? serviceMatch.duration : 30;
    return "DATE_PROVIDED";
  }

  if (serviceMatch) {
    session.stage = "AWAITING_DATE";
    session.data.service = serviceMatch.name;
    session.data.duration = serviceMatch.duration;

    await sendTranslatedMessage({
      text: `Perfect! What time works for your ${serviceMatch.name}?`,
      business,
      from,
      phoneId,
      session,
    });
    return "CONTINUE";
  }

  const template = buildServiceTemplate(business, type);

  const list = await translateList(
    buildServiceTemplate(business, type),
    detectedLang,
  );

  await sendListMessage({
    phoneId,
    from,
    headerText: list.header,
    bodyText: list.body,
    buttonText: list.button,
    options: list.options,
    accessToken: business.accessToken,
  });

  session.stage = "AWAITING_SERVICE";
  return "CONTINUE";
};
