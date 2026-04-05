const { DateTime } = require("luxon");
const Appointment = require("../models/Appointment");
const AvailabilityOverride = require("../models/Availibiliy");

function toMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

async function getWorkingPeriods(business, date) {
  const dayStart = date.startOf("day").toJSDate();

  const override = await AvailabilityOverride.findOne({
    businessId: business._id,
    date: dayStart,
  }).lean();

  if (override) {
    if (override.type === "closed") return [];
    return override.workingPeriods || [];
  }

  const weekday = date.toFormat("ccc").toLowerCase();
  return business.workingPeriods[weekday] || [];
}

async function scanAvailabilityTimeline({
  business,
  startDateTime,
  serviceDuration,
  limit,
  staffId = null,
  exactMatchOnly = false,
}) {
  const timezone = business.timezone || "UTC";
  const step = business.slotStepMinutes || 5;

  let cursor = DateTime.fromJSDate(startDateTime, { zone: timezone });
  const results = [];

  const MAX_DAYS_SCAN = 30;

  for (let dayOffset = 0; dayOffset < MAX_DAYS_SCAN; dayOffset++) {
    const currentDate = cursor.plus({ days: dayOffset }).startOf("day");

    const workingPeriods = await getWorkingPeriods(business, currentDate);
    if (workingPeriods.length === 0) continue;

    const dayStart = currentDate.toJSDate();
    const dayEnd = currentDate.endOf("day").toJSDate();

    const appointments = await Appointment.find({
      businessId: business._id,
      staffId: staffId,
      status: "scheduled",
      startTime: { $lt: dayEnd },
      endTime: { $gt: dayStart },
    }).lean();

    for (const period of workingPeriods) {
      let startMinute =
        dayOffset === 0
          ? Math.max(
              toMinutes(cursor.toFormat("HH:mm")),
              toMinutes(period.start),
            )
          : toMinutes(period.start);

      const periodEnd = toMinutes(period.end);

      while (startMinute + serviceDuration <= periodEnd) {
        const endMinute = startMinute + serviceDuration;

        let conflict = false;
        for (const appt of appointments) {
          const aStart = DateTime.fromJSDate(appt.startTime, {
            zone: timezone,
          });
          const aEnd = DateTime.fromJSDate(appt.endTime, {
            zone: timezone,
          });

          const apptStartMin = aStart.hour * 60 + aStart.minute;
          const apptEndMin = aEnd.hour * 60 + aEnd.minute;

          if (overlaps(startMinute, endMinute, apptStartMin, apptEndMin)) {
            conflict = true;
            break;
          }
        }

        if (!conflict) {
          const slotStart = currentDate
            .set({
              hour: Math.floor(startMinute / 60),
              minute: startMinute % 60,
            })
            .toJSDate();

          const slotEnd = currentDate
            .set({
              hour: Math.floor(endMinute / 60),
              minute: endMinute % 60,
            })
            .toJSDate();

          results.push({ start: slotStart, end: slotEnd });

          if (exactMatchOnly) return results;
          if (results.length === limit) return results;
        }

        startMinute += step;
      }
    }
  }

  return results;
}

async function isSlotAvailable({
  business,
  startDateTime,
  serviceDuration,
  staffId = null,
}) {
  const result = await scanAvailabilityTimeline({
    business,
    startDateTime,
    serviceDuration,
    limit: 1,
    exactMatchOnly: true,
    staffId: staffId,
  });

  return (
    result.length === 1 && result[0].start.getTime() === startDateTime.getTime()
  );
}

async function findNextAvailableSlots({
  business,
  startDateTime,
  serviceDuration,
  maxResults = 3,
  staffId = null,
}) {
  return scanAvailabilityTimeline({
    business,
    startDateTime,
    serviceDuration,
    limit: maxResults,
    exactMatchOnly: false,
    staffId: staffId,
  });
}

module.exports = {
  isSlotAvailable,
  findNextAvailableSlots,
};
