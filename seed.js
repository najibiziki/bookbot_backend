require("dotenv").config();
const mongoose = require("mongoose");
const Business = require("./models/Business");

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to DB for seeding...");

    const businessData = {
      owner: "Alexandra",
      name: "Joe's Barber Shop",
      phoneId: "972922779238492",
      accessToken: process.env.TOKEN,
      timezone: "Africa/Casablanca",

      // NEW: Business Description
      description:
        "Professional barbershop offering classic cuts, beard trims, and styling.",

      slotStepMinutes: 5,

      workingPeriods: {
        mon: [
          { start: "09:00", end: "13:00" },
          { start: "15:00", end: "19:00" },
        ],
        tue: [{ start: "09:00", end: "19:00" }],
        wed: [{ start: "09:00", end: "19:00" }],
        thu: [{ start: "09:00", end: "19:00" }],
        fri: [{ start: "09:00", end: "19:00" }],
        sat: [],
        sun: [],
      },

      // Updated Service IDs to be "Real"
      services: [
        { id: "svc_haircut", name: "Haircut", duration: 30, price: 25 },
        { id: "svc_beard", name: "Beard Trim", duration: 15, price: 15 },
        { id: "svc_color", name: "Hair Coloring", duration: 60, price: 50 },
      ],

      // NEW: Staff (Employees)
      staff: [
        {
          id: "staff_najib",
          name: "Najib",
          price: 20, // Override price for Najib
          description: "Master Barber",
        },
        {
          id: "staff_morad",
          name: "Morad",
          price: 30, // Override price for Morad
          description: "Senior Stylist",
        },
      ],

      billing: {
        plan: "free",
        conversationsThisMonth: 0,
        uniqueClientsThisMonth: 0,
        estimatedCostThisMonth: 0,
      },
    };

    const existing = await Business.findOne({ phoneId: businessData.phoneId });

    if (existing) {
      console.log(
        "⚠️ Business with this Phone ID already exists:",
        existing.name,
      );
    } else {
      const business = await Business.create(businessData);
      console.log("✅ Business added successfully:", business.name);
    }

    await mongoose.disconnect();
    console.log("🔌 Disconnected from DB");
  } catch (err) {
    console.error("❌ Seeding error:", err);
    process.exit(1);
  }
})();
