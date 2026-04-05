const moment = require("moment-timezone");
const { extractBookingIntent, validateTime } = require("../date");
const { isSlotAvailable, findNextAvailableSlots } = require("../availability");
const { sendTranslatedMessage } = require("../translator");
const Appointment = require("../../models/Appointment");

module.exports = async function handleModify({
  text,
  business,
  from,
  phoneId,
  session,
}) {
  const tz = business.timezone || "UTC";

  if (text.toLowerCase().startsWith("modify_")) {
    const apptId = text.split("_")[1];

    try {
      const appt = await Appointment.findById(apptId);

      if (
        !appt ||
        appt.clientPhone !== from ||
        appt.businessId.toString() !== business._id.toString()
      ) {
        await sendTranslatedMessage({
          text: "Appointment not found.",
          business,
          from,
          phoneId,
          session,
        });
        return "ERROR";
      }

      session.data.modifyingId = appt._id;
      session.data.serviceDuration = appt.serviceDuration;
      session.data.serviceName = appt.serviceName;

      const m = moment(appt.startTime).tz(tz);
      await sendTranslatedMessage({
        text: `
        Got it!
- When would you like to reschedule your *${appt.serviceName}*?
- Currently set for: ${m.format("ddd, DD MMM at HH:mm")}`,
        business,
        from,
        phoneId,
        session,
      });

      session.stage = "AWAITING_NEW_DATE";
      return "SUCCESS";
    } catch (e) {
      console.error("Modify Init Error", e);
      await sendTranslatedMessage({
        text: "I couldn't find your appointment.",
        business,
        from,
        phoneId,
        session,
      });
      return "ERROR";
    }
  }

  if (session.stage !== "AWAITING_NEW_DATE") return "CONTINUE";

  const bookingData = await extractBookingIntent(text);
  if (!bookingData || !bookingData.date || !bookingData.time) {
    await sendTranslatedMessage({
      text: "Please let me know the date and time to reschedule.",
      business,
      from,
      phoneId,
      session,
    });
    return "CONTINUE";
  }

  const now = moment().tz(tz);
  const timeCheck = validateTime(bookingData.date, bookingData.time, tz, now);

  if (!timeCheck.valid) {
    const msg =
      timeCheck.type === "PAST_DATE"
        ? `Oops! That time is in the past. 😅\nIt's now ${currentTime}. Please pick a future time.`
        : `I didn't quite catch that. 🤔\nToday is ${currentDate}. Try writing it like '${currentDate} at 14:00'?`;

    await sendTranslatedMessage({
      text: msg,
      business,
      from,
      phoneId,
      session,
    });
    return "CONTINUE";
  }

  try {
    const isAvailable = await isSlotAvailable({
      business,
      startDateTime: timeCheck.date,
      serviceDuration: session.data.serviceDuration,
    });

    if (!isAvailable) {
      const suggestions = await findNextAvailableSlots({
        business,
        startDateTime: timeCheck.date,
        serviceDuration: session.data.serviceDuration,
        maxResults: 3,
      });

      const slotsList = suggestions
        .map((s) => {
          const m = moment(s.start).tz(tz);
          return `- ${m.format("ddd, DD MMM")} at ${m.format("HH:mm")}`;
        })
        .join("\n");

      await sendTranslatedMessage({
        text: `Oops, that time is taken.
  How about one of these times instead:
  ${slotsList}`,
        business,
        from,
        phoneId,
        session,
      });
      return "CONTINUE";
    }

    const duration = session.data.serviceDuration;
    const newEndTime = new Date(timeCheck.date.getTime() + duration * 60000);

    await Appointment.updateOne(
      { _id: session.data.modifyingId },
      {
        startTime: timeCheck.date,
        endTime: newEndTime,
      },
    );

    const m = moment(timeCheck.date).tz(tz);
    await sendTranslatedMessage({
      text: `✅ Appointment Rescheduled!
- Service : ${session.data.serviceName}
- New Date: ${m.format("ddd, DD MMM")}
- New Time: ${m.format("HH:mm")}

See you then! 👋`,
      business,
      from,
      phoneId,
      session,
    });
    session.data.alertedUpcoming = false;
    session.stage = "GREETING";
    session.data.modifyingId = null;

    return "SUCCESS";
  } catch (e) {
    await sendTranslatedMessage({
      text: "Sorry, I couldn't update your appointment.",
      business,
      from,
      phoneId,
      session,
    });
    return "ERROR";
  }
};
