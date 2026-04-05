const mongoose = require("mongoose");

const AvailabilityOverrideSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    date: {
      type: Date,
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["closed", "custom"],
      required: true,
    },

    workingPeriods: [
      {
        start: String,
        end: String,
      },
    ],
  },
  { timestamps: true },
);

AvailabilityOverrideSchema.index({ businessId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model(
  "AvailabilityOverride",
  AvailabilityOverrideSchema,
);
