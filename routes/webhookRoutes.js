const express = require("express");
const router = express.Router();
const webhookController = require("../controllers/webhookController");
const checkSubscription = require("../middleware/checkSubscription");
router.get("/webhook", webhookController.verifyWebhook);

router.post("/webhook", checkSubscription, webhookController.receiveMessage);

module.exports = router;
