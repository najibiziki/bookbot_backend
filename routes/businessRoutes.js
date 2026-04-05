const express = require("express");
const router = express.Router();
const businessController = require("../controllers/businessController");
const { protect } = require("../middleware/authMiddleware");

// User Routes
router.post("/", protect, businessController.createBusiness);
router.get("/mybusiness", protect, businessController.getMyBusiness);

// Dynamic ID Routes (Keep last)
router.get("/:id", protect, businessController.getBusinessById);
router.put("/:id", protect, businessController.updateBusiness);

module.exports = router;
