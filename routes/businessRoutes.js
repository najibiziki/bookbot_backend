const express = require("express");
const router = express.Router();
const businessController = require("../controllers/businessController");
const { protect } = require("../middleware/authMiddleware");
const { getMyAppointments } = require("../controllers/appointmentController");
// User Routes
router.post("/", protect, businessController.createBusiness);
router.get("/mybusiness", protect, businessController.getMyBusiness);
router.get("/appointments", protect, getMyAppointments);

// Dynamic ID Routes (Keep last)
router.get("/:id", protect, businessController.getBusinessById);
router.put("/:id", protect, businessController.updateBusiness);
module.exports = router;
