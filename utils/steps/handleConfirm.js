const moment = require("moment-timezone");
const { sendTranslatedMessage } = require("../translator");
const { resetSession } = require("../sessionManager");
const Appointment = require("../../models/Appointment");

module.exports = async function handleConfirm({
  text,
  business,
  from,
  phoneId,
  session,
}) {
  let clientName = text.trim();

  if (!clientName) {
    await sendTranslatedMessage({
      text: "What is your name?",
      business,
      from,
      phoneId,
      session,
    });
    return "CONTINUE";
  }

  if (!session.data.lastCheckedDate) {
    await sendTranslatedMessage({
      text: "I forgot, which time did you want?",
      business,
      from,
      phoneId,
      session,
    });
    return "CONTINUE";
  }

  try {
    const duration = session.data.serviceDuration || 30;
    let price = 0;
    const selectedService = business.services.find(
      (s) => s.id === session.data.serviceId || s.name === session.data.service,
    );
    if (selectedService) {
      price = selectedService.price;
    }

    const endDate = new Date(
      session.data.lastCheckedDate.getTime() + duration * 60000,
    );

    await Appointment.create({
      businessId: business._id,
      clientPhone: from,
      clientName: clientName,
      serviceId: session.data.serviceId,
      serviceName: session.data.service,
      serviceDuration: session.data.serviceDuration,
      staffId: session.data.staffId,
      staffName: session.data.staffName,
      startTime: session.data.lastCheckedDate,
      endTime: endDate,
      status: "scheduled",
    });

    const m = moment(session.data.lastCheckedDate).tz(business.timezone);

    await sendTranslatedMessage({
      text: `✅ *Appointment Confirmed!*

- Service  : ${session.data.service}  
- Price    : $${price}
- Duration : ${duration}m
- Date     : ${m.format("ddd, DD MMM")} at ${m.format("HH:mm")}

See you soon, ${clientName}!`,
      business,
      from,
      phoneId,
      session,
    });

    resetSession(from);
  } catch (e) {
    await sendTranslatedMessage({
      text: "I had trouble saving your appointment. Please try again.",
      business,
      from,
      phoneId,
      session,
    });
  }
  return "CONTINUE";
};
