const cron = require("node-cron");
const BusinessOwner = require("../models/BusinessOwner");

const checkSubscriptions = () => {
  cron.schedule("0 0 * * *", async () => {
    console.log("⏰ Running Subscription Check...");

    const now = new Date();

    try {
      const expiredTrials = await BusinessOwner.updateMany(
        {
          isOnTrial: true,
          trialEndsAt: { $lt: now },
          isActive: true,
        },
        {
          $set: { isActive: false, isOnTrial: false },
        },
      );
      if (expiredTrials.modifiedCount > 0) {
        console.log(
          `⚠️ Deactivated ${expiredTrials.modifiedCount} expired trials.`,
        );
      }

      const expiredPaid = await BusinessOwner.updateMany(
        {
          paidUntil: { $lt: now },
          isActive: true,
        },
        {
          $set: { isActive: false },
        },
      );
      if (expiredPaid.modifiedCount > 0) {
        console.log(
          `⚠️ Deactivated ${expiredPaid.modifiedCount} expired subscriptions.`,
        );
      }
    } catch (error) {
      console.error("Error checking subscriptions:", error);
    }
  });
};

module.exports = checkSubscriptions;
