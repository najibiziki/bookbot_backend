const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { protect, admin } = require("../middleware/authMiddleware");

router.get("/businesses", protect, admin, adminController.getAllBusinesses);
router.put("/token", protect, admin, adminController.updateAllTokens);
router.put(
  "/status/:ownerId",
  protect,
  admin,
  adminController.updateOwnerStatus,
);
router.delete("/businesses/:id", protect, adminController.deleteBusiness);
module.exports = router;
