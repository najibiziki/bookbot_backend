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

  // FIX: Added these missing variables for your error messages
  const currentTime = now.format("HH:mm");
  const currentDate = now.format("ddd, DD MMM");

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
        // --- NEW: Smart Reason Detection ---
        let reasonMsg = "😔 That time is taken.";
        const requestedDate = moment(timeCheck.date).tz(tz);
        const requestedDay = requestedDate.format("ddd").toLowerCase();
        const selectedStaff = business.staff.find(
          (s) => s.id === session.data.staffId,
        );

        if (selectedStaff) {
          // 1. Check if it's a weekly day off
          if (
            selectedStaff.weeklyOff &&
            selectedStaff.weeklyOff.includes(requestedDay)
          ) {
            reasonMsg = `😔 ${selectedStaff.name} does not work on ${requestedDate.format("dddd")}s.`;
          }
          // 2. Check if it's a vacation period
          else if (
            selectedStaff.vacations &&
            selectedStaff.vacations.length > 0
          ) {
            const currentJSDate = requestedDate.toDate();
            for (const vacation of selectedStaff.vacations) {
              if (
                currentJSDate >= vacation.start &&
                currentJSDate <= vacation.end
              ) {
                reasonMsg = `😔 ${selectedStaff.name} is on vacation until ${moment(vacation.end).tz(tz).format("DD MMM")}.`;
                break;
              }
            }
          }
        }
        // ------------------------------------

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
          text: `${reasonMsg}\n\nHere are the next available slots:\n${slotsList}`,
          business,
          from,
          phoneId,
          session,
        });
      }
    } catch (e) {
      console.error("Availability Error:", e.message);
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
