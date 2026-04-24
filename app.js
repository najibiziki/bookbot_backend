const express = require("express");
const cors = require("cors");
const webhookRoutes = require("./routes/webhookRoutes");
const businessRoutes = require("./routes/businessRoutes");
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const checkSubscriptions = require("./utils/subscriptionChecker");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: ["http://localhost:3000", "https://bookbot-rouge.vercel.app"],
    credentials: true,
  }),
);
checkSubscriptions();
app.use(webhookRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("WhatsApp SaaS API is Running 🚀");
});

module.exports = app;
