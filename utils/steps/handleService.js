const { sendTranslatedMessage, translateList } = require("../translator");
const { sendListMessage } = require("../../services/whatsappService");
const { buildServiceTemplate, matchService } = require("../botHelpers");

module.exports = async function handleService({
  text,
  business,
  from,
  phoneId,
  session,
}) {
  const lang = session.data.lang || "en";

  const serviceMatch = await matchService(text, business);

  if (serviceMatch) {
    session.data.service = serviceMatch.name;
    session.data.serviceId = serviceMatch.id;
    session.data.serviceDuration = serviceMatch.duration;

    if (business.staff && business.staff.length > 0) {
      session.stage = "AWAITING_STAFF";

      const staffTemplate = {
        header: "Our Team",
        body: "Please select a stylist to proceed:",
        button: "View Stylists",
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
    } else {
      session.stage = "AWAITING_DATE";

      const askDateText = `Perfect! When works for your *${serviceMatch.name}*?`;
      await sendTranslatedMessage({
        text: askDateText,
        business,
        from,
        phoneId,
        session,
      });
    }
    return "CONTINUE";
  }

  const template = buildServiceTemplate(business, "default");

  const list = await translateList(template, lang);

  await sendListMessage({
    phoneId,
    from,
    headerText: list.header,
    bodyText: list.body,
    buttonText: list.button,
    options: list.options,
    accessToken: business.accessToken,
  });

  return "CONTINUE";
};
