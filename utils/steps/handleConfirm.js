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

  if (!session.data.serviceId) {
    await sendTranslatedMessage({
      text: "It looks like we lost track of your booking details. Please start over by typing 'Hello' and choosing a service.",
      business,
      from,
      phoneId,
      session,
    });
    const { resetSession } = require("../sessionManager");
    resetSession(from);
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
    // session.data.serviceDuration is now the FINAL total time (e.g., 42m)
    const finalDuration = session.data.serviceDuration || 30;
    let basePrice = 0;
    let extraFee = 0;

    // 1. Find the service to get the Base Price
    const selectedService = business.services.find(
      (s) =>
        s._id.toString() === session.data.serviceId ||
        s.name === session.data.service,
    );

    if (selectedService) {
      basePrice = selectedService.price;
    }

    // 2. Find the staff member to get the Extra Fee ONLY
    const selectedStaff = business.staff.find(
      (s) =>
        s._id.toString() === session.data.staffId ||
        s.name === session.data.staffName,
    );

    if (selectedStaff && selectedStaff.price) {
      extraFee = selectedStaff.price;
    }

    // 3. Calculate Total Price
    const totalPrice = basePrice + extraFee;

    const endDate = new Date(
      session.data.lastCheckedDate.getTime() + finalDuration * 60000,
    );

    await Appointment.create({
      businessId: business._id,
      clientPhone: from,
      clientName: clientName,
      serviceId: session.data.serviceId,
      serviceName: session.data.service,
      serviceDuration: finalDuration,
      staffId: session.data.staffId,
      staffName: session.data.staffName,
      startTime: session.data.lastCheckedDate,
      endTime: endDate,
      status: "scheduled",
      totalPrice: totalPrice,
    });

    const m = moment(session.data.lastCheckedDate).tz(business.timezone);

    await sendTranslatedMessage({
      text: `✅ Appointment Confirmed!

- Service  : ${session.data.service}
- Price    : $${totalPrice}
- Duration : ${finalDuration}m
- Date     : ${m.format("ddd, DD MMM")} at ${m.format("HH:mm")}

See you soon, ${clientName}!`,
      business,
      from,
      phoneId,
      session,
    });

    resetSession(from);
  } catch (e) {
    console.error(e);
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
