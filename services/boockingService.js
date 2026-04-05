const Business = require("../models/Business");
const { getSession } = require("../utils/sessionManager");
const { sendTranslatedMessage } = require("../services/whatsappService");

// Import all steps
const { handleUpcoming } = require("../utils/steps/handleUpcoming");
const handleGreeting = require("../utils/steps/handleGreeting");
const handleService = require("../utils/steps/handleService");
const handleStaff = require("../utils/steps/handleStaff"); // <--- Import Staff
const handleDate = require("../utils/steps/handleDate");
const handleConfirm = require("../utils/steps/handleConfirm");
const handleDelete = require("../utils/steps/handleDelete");

const processMessage = async (from, text, phoneId) => {
  const business = await Business.findOne({ phoneId });
  if (!business) return;

  const session = getSession(from);

  // ---------------------------------------------------------
  // 1. Handle "New Appointment" Click
  // ---------------------------------------------------------
  if (text.toLowerCase().startsWith("new_appt")) {
    session.data.skipUpcomingCheck = true;
    await handleGreeting({
      text,
      business,
      from,
      phoneId,
      session,
      type: "default",
    });
    return;
  }

  // ---------------------------------------------------------
  // 2. Handle Delete Action
  // ---------------------------------------------------------
  if (text.toLowerCase().startsWith("delete_")) {
    const apptId = text.split("_")[1];
    const result = await handleDelete({
      business,
      from,
      phoneId,
      session,
      apptId,
    });
    if (result === "SUCCESS") {
      await handleGreeting({
        text,
        business,
        from,
        phoneId,
        session,
        type: "default",
      });
    }
    return;
  }

  // ---------------------------------------------------------
  // 3. Handle Modify Action
  // ---------------------------------------------------------
  if (text.toLowerCase().startsWith("modify_")) {
    await handleModify({ text, business, from, phoneId, session });
    return;
  }

  // ---------------------------------------------------------
  // 4. Handle Upcoming Check
  // ---------------------------------------------------------
  if (!session.data.skipUpcomingCheck) {
    const hasUpcoming = await handleUpcoming({
      business,
      from,
      phoneId,
      session,
    });

    if (hasUpcoming) {
      return;
    }
  }

  // ---------------------------------------------------------
  // 5. Normal Flow (Switch)
  // ---------------------------------------------------------
  switch (session.stage) {
    case "GREETING":
      const greetingResult = await handleGreeting({
        text,
        business,
        from,
        phoneId,
        session,
      });
      if (greetingResult === "DATE_PROVIDED") {
        await handleDate({ text, business, from, phoneId, session });
      }
      break;

    case "AWAITING_SERVICE":
      await handleService({ text, business, from, phoneId, session });
      break;

    // ---------------------------------------------------------
    // NEW: Handle Staff Selection
    // ---------------------------------------------------------
    case "AWAITING_STAFF":
      await handleStaff({ text, business, from, phoneId, session });
      break;

    case "AWAITING_DATE":
    case "AWAITING_CONFIRMATION":
      const dateResult = await handleDate({
        text,
        business,
        from,
        phoneId,
        session,
      });
      if (dateResult === "NEEDS_CONFIRMATION") {
        await handleConfirm({ text, business, from, phoneId, session });
      }
      break;

    default:
      session.stage = "GREETING";
      await handleGreeting({ text, business, from, phoneId, session });
  }
};

module.exports = { processMessage };
