const express = require("express");
const router = express.Router();

const businessOwnerController = require("../controllers/businessOwnerController");

router.post("/register", businessOwnerController.register);

router.post("/login", businessOwnerController.login);

router.post("/forgotpassword", businessOwnerController.forgotPassword);

router.put("/resetpassword/:token", businessOwnerController.resetPassword);

module.exports = router;
