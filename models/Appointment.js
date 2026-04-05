const mongoose = require("mongoose");

const AppointmentSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    clientPhone: {
      type: String,
      required: true,
      index: true,
    },

    clientName: {
      type: String,
      required: true,
    },

    serviceId: {
      type: String,
      required: true,
    },

    serviceName: {
      type: String,
      required: true,
    },

    serviceDuration: {
      type: Number,
      required: true,
    },
    staffId: {
      type: String,
      default: null,
    },
    staffName: {
      type: String,
      default: "",
    },
    startTime: {
      type: Date,
      required: true,
      index: true,
    },

    endTime: {
      type: Date,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["scheduled", "cancelled", "completed"],
      default: "scheduled",
      index: true,
    },
  },
  { timestamps: true },
);

AppointmentSchema.index(
  { businessId: 1, startTime: 1, endTime: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "scheduled" },
  },
);

module.exports = mongoose.model("Appointment", AppointmentSchema);
