const Appointment = require("../../models/Appointment");
const { sendTranslatedMessage } = require("../../utils/translator");

module.exports = async function handleDelete({
  business,
  from,
  phoneId,
  session,
  apptId,
}) {
  try {
    const deletedAppt = await Appointment.findOneAndDelete({
      _id: apptId,
      clientPhone: from,
      businessId: business._id,
      status: "scheduled",
    });

    if (!deletedAppt) {
      return "ERROR";
    }

    await sendTranslatedMessage({
      text: `✅ *Appointment cancelled*. 

Please choose a service if you'd like to book a new one:`,
      business,
      from,
      phoneId,
      session,
    });

    session.stage = "GREETING";

    return "SUCCESS";
  } catch (e) {
    console.error("Delete Error", e);
    await sendTranslatedMessage({
      text: "Sorry, I had trouble cancelling that.",
      business,
      from,
      phoneId,
      session,
    });
    return "ERROR";
  }
};
