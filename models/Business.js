const mongoose = require("mongoose");

const BusinessSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    owner: { type: String, required: true },

    phoneNumber: { type: String, default: "" },

    phoneId: { type: String, required: false, index: true },

    accessToken: { type: String, default: "" },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessOwner",
    },
    timezone: {
      type: String,
      default: "UTC",
    },

    description: {
      type: String,
      default: "",
    },

    workingPeriods: {
      mon: [{ start: String, end: String }],
      tue: [{ start: String, end: String }],
      wed: [{ start: String, end: String }],
      thu: [{ start: String, end: String }],
      fri: [{ start: String, end: String }],
      sat: [{ start: String, end: String }],
      sun: [{ start: String, end: String }],
    },

    slotStepMinutes: {
      type: Number,
      default: 5,
      min: 1,
    },

    staff: [
      {
        name: { type: String, required: true },
        price: { type: Number, default: 0 },
        role: { type: String, default: "" },
      },
    ],

    services: [
      {
        name: { type: String, required: true },
        duration: { type: Number, required: true }, // minutes
        price: { type: Number, required: true },
      },
    ],

    billing: {
      plan: {
        type: String,
        enum: ["free", "starter", "pro"],
        default: "free",
      },
      conversationsThisMonth: { type: Number, default: 0 },
      uniqueClientsThisMonth: { type: Number, default: 0 },
      estimatedCostThisMonth: { type: Number, default: 0 },
      nextResetDate: {
        type: Date,
        default: () => {
          const d = new Date();
          d.setMonth(d.getMonth() + 1);
          d.setDate(1);
          d.setHours(0, 0, 0, 0);
          return d;
        },
      },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Business", BusinessSchema);
