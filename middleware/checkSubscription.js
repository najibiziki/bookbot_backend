const Business = require("../models/Business");
const BusinessOwner = require("../models/BusinessOwner");
const { sendMessage } = require("../services/whatsappService");

const checkSubscription = async (req, res, next) => {
  try {
    if (req.method === "GET") return next();

    const payload = req.body?.entry?.[0]?.changes?.[0]?.value;
    if (!payload?.messages?.length) return res.status(200).send("OK");

    const { metadata, messages } = payload;
    const metaPhoneId = metadata.phone_number_id;
    const senderPhone = messages[0].from;

    if (senderPhone === metaPhoneId) return res.status(200).send("OK");

    const business = await Business.findOne({ phoneId: metaPhoneId });
    if (!business) return res.status(200).send("OK");

    const owner = await BusinessOwner.findById(business.ownerId);
    if (!owner) return res.status(200).send("OK");

    const now = new Date();
    let hasAccess =
      (owner.isOnTrial && owner.trialEndsAt > now) ||
      (owner.isActive && owner.paidUntil && owner.paidUntil > now);

    if (hasAccess) {
      req.business = business;
      req.owner = owner;
      return next();
    }

    let blockReason = "deactivated";
    if (owner.isOnTrial && owner.trialEndsAt <= now) {
      blockReason = "trial_ended";
    } else if (
      (owner.isActive && owner.paidUntil && owner.paidUntil <= now) ||
      (!owner.isActive && owner.paidUntil && owner.paidUntil <= now)
    ) {
      blockReason = "subscription_expired";
    } else if (
      !owner.paidUntil &&
      owner.trialEndsAt &&
      owner.trialEndsAt <= now
    ) {
      blockReason = "trial_ended";
    }

    if (blockReason === "deactivated") return res.status(200).send("OK");

    const cleanSender = senderPhone.replace(/\D/g, "");
    const cleanOwner = business.phoneNumber
      .replace(/^0/, "212")
      .replace(/\D/g, "");
    if (cleanSender === cleanOwner) return res.status(200).send("OK");

    let alreadySent =
      (blockReason === "trial_ended" && owner.trialAlertSent) ||
      (blockReason === "subscription_expired" && owner.expiredAlertSent);
    if (alreadySent) return res.status(200).send("OK");

    const alertMessages = {
      trial_ended: `Hello,\n\nYour free trial period for "${business.name}" has concluded.\n\nTo ensure uninterrupted service for your clients, please upgrade to a paid subscription.\n\nFor assistance, you can contact our support team at: +212 611 693 494`,
      subscription_expired: `Hello,\n\nThe subscription for "${business.name}" has expired.\n\nPlease renew your plan as soon as possible to avoid any disruption to your booking system.\n\nFor assistance, you can contact our support team at: +212 611 693 494`,
    };

    if (cleanOwner && business.accessToken) {
      sendMessage(
        business.phoneId,
        cleanOwner,
        alertMessages[blockReason],
        business.accessToken,
      )
        .then(async () => {
          if (blockReason === "trial_ended") owner.trialAlertSent = true;
          if (blockReason === "subscription_expired")
            owner.expiredAlertSent = true;
          await owner.save();
        })
        .catch(() => {});
    }

    return res.status(200).send("OK");
  } catch (error) {
    return res.status(200).send("OK");
  }
};

module.exports = checkSubscription;
