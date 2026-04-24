const cron = require("node-cron");
const BusinessOwner = require("../models/BusinessOwner");

const checkSubscriptions = () => {
  cron.schedule("0 0 * * *", async () => {
    console.log("⏰ Running Subscription Check...");
    const now = new Date();

    try {
      // 1. Turn off trials that are past their date
      const expiredTrials = await BusinessOwner.updateMany(
        { isOnTrial: true, trialEndsAt: { $lt: now } },
        { $set: { isOnTrial: false } },
      );
      if (expiredTrials.modifiedCount > 0) {
        console.log(`⚠️ Ended ${expiredTrials.modifiedCount} expired trials.`);
      }

      // 2. Turn off paid subscriptions that are past their date
      const expiredPaid = await BusinessOwner.updateMany(
        { isActive: true, paidUntil: { $lt: now } },
        { $set: { isActive: false } },
      );
      if (expiredPaid.modifiedCount > 0) {
        console.log(
          `⚠️ Ended ${expiredPaid.modifiedCount} expired paid subscriptions.`,
        );
      }
    } catch (error) {
      console.error("Error checking subscriptions:", error);
    }
  });
};

module.exports = checkSubscriptions;
