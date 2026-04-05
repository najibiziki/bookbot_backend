const moment = require("moment-timezone");
const { extractBookingIntent, validateTime } = require("../date");
const { isSlotAvailable, findNextAvailableSlots } = require("../availability");
const { sendTranslatedMessage } = require("../translator");

module.exports = async function handleDate({
  text,
  business,
  from,
  phoneId,
  session,
}) {
  const tz = business.timezone || "UTC";
  const now = moment().tz(tz);
  if (text.toLowerCase().startsWith("confirm")) {
    return "NEEDS_CONFIRMATION";
  }

  const bookingData = await extractBookingIntent(text);

  if (bookingData && bookingData.date && bookingData.time) {
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
        serviceDuration: session.data.duration || 30,
        staffId: session.data.staffId,
      });

      if (isAvailable) {
        session.stage = "AWAITING_CONFIRMATION";
        session.data.lastCheckedDate = timeCheck.date;

        const m = moment(timeCheck.date).tz(tz);
        await sendTranslatedMessage({
          text: `✅ *Great!* \n ${m.format("ddd, DD MMM")} at ${m.format("HH:mm")} is available.\n\nPlease send your name to book.`,
          business,
          from,
          phoneId,
          session,
        });
      } else {
        const suggestions = await findNextAvailableSlots({
          business,
          startDateTime: timeCheck.date,
          serviceDuration: session.data.duration || 30,
          staffId: session.data.staffId,
          maxResults: 3,
        });

        const slotsList = suggestions
          .map((s) => {
            const m = moment(s.start).tz(tz);
            return `${m.format("ddd, DD MMM")} at ${m.format("HH:mm")}`;
          })
          .join("\n");

        await sendTranslatedMessage({
          text: `😔 That time is taken.\n\nHere are the next slots:\n${slotsList}`,
          business,
          from,
          phoneId,
          session,
        });
      }
    } catch (e) {
      await sendTranslatedMessage({
        text: "I'm having trouble finding a time.",
        business,
        from,
        phoneId,
        session,
      });
    }
  } else {
    if (session.data.lastCheckedDate) {
      return "NEEDS_CONFIRMATION";
    }
    await sendTranslatedMessage({
      text: "I forgot, which time did you want?",
      business,
      from,
      phoneId,
      session,
    });
  }
  return "CONTINUE";
};
