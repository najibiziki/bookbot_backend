const moment = require("moment-timezone");
const Appointment = require("../../models/Appointment");

async function sendButtonMessage({
  phoneId,
  from,
  headerText,
  bodyText,
  buttons,
  accessToken,
}) {
  const actions = buttons.map((btn) => ({
    type: "reply",
    reply: {
      id: btn.id,
      title: btn.text,
    },
  }));

  const payload = {
    messaging_product: "whatsapp",
    to: from,
    type: "interactive",
    interactive: {
      type: "button",
      header: {
        type: "text",
        text: headerText,
      },
      body: {
        text: bodyText,
      },
      action: {
        buttons: actions,
      },
    },
  };

  const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;

  const axios = require("axios");
  await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
}

async function handleUpcoming({ business, from, phoneId, session }) {
  const tz = business.timezone || "UTC";

  if (session.data.alertedUpcoming) {
    return false;
  }

  const upcomingAppt = await Appointment.findOne({
    clientPhone: from,
    status: "scheduled",
    startTime: { $gte: new Date() },
  }).sort({ startTime: 1 });

  if (!upcomingAppt) {
    return false;
  }

  const m = moment(upcomingAppt.startTime).tz(tz);
  const bodyText = `
- Service : ${upcomingAppt.serviceName} 
- Duration:${upcomingAppt.serviceDuration}m
- Date    : ${m.format("ddd, DD MMM")}
- Time    : ${m.format("HH:mm")}`;

  const buttons = [
    { id: `modify_${upcomingAppt._id}`, text: "📝 Modify" },
    { id: `delete_${upcomingAppt._id}`, text: "❌ Delete" },
    { id: `new_appt`, text: "➕ New Appointment" },
  ];

  await sendButtonMessage({
    phoneId,
    from,
    headerText: "You have an appointment:",
    bodyText: bodyText,
    buttons: buttons,
    accessToken: business.accessToken,
  });

  session.data.alertedUpcoming = true;

  return true;
}

module.exports = { handleUpcoming };
