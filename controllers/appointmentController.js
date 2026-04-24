const Appointment = require("../models/Appointment");
const Business = require("../models/Business");

exports.getMyAppointments = async (req, res) => {
  try {
    const ownerId = req.user._id; // Adjust based on how your auth middleware works

    const business = await Business.findOne({ ownerId });
    if (!business)
      return res.status(404).json({ message: "Business not found" });

    // Fetch appointments sorted chronologically
    const appointments = await Appointment.find({
      businessId: business._id,
    }).sort({ startTime: 1 });

    // Send both appointments and the business timezone
    res.status(200).json({
      appointments,
      timezone: business.timezone || "UTC",
    });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
