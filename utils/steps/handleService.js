const { sendTranslatedMessage, translateList } = require("../translator");
const { sendListMessage } = require("../../services/whatsappService");
const { buildServiceTemplate, matchService } = require("../botHelpers"); // <-- Notice this import!

module.exports = async function handleService({
  text,
  business,
  from,
  phoneId,
  session,
}) {
  const lang = session.data.lang || "en";

  const serviceMatch = await matchService(text, business); // <-- Notice this!

  if (serviceMatch) {
    session.data.service = serviceMatch.name;
    session.data.serviceId = serviceMatch._id.toString(); // SAVES THE ID!
    session.data.serviceDuration = serviceMatch.duration;

    if (business.staff && business.staff.length > 0) {
      session.stage = "AWAITING_STAFF";

      const staffTemplate = {
        header: "Our Team",
        body: "Please select a team member to proceed:",
        button: "Team Members",
        options: business.staff.map((s) => {
          let desc = (s.role || "Staff").trim();
          if (s.price) desc += ` | Extra fee: +${s.price}`;
          if (s.extraTime) desc += ` | Extra time: +${s.extraTime}m`;
          return {
            id: s._id.toString(),
            title: s.name,
            desc: desc,
          };
        }),
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
