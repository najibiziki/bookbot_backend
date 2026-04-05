const BusinessOwner = require("../models/BusinessOwner");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

/* --- Register --- */
exports.register = async (req, res) => {
  const { email, password } = req.body;

  try {
    const emailExists = await BusinessOwner.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const owner = await BusinessOwner.create({
      email,
      password,
    });

    if (owner) {
      res.status(201).json({
        _id: owner._id,
        email: owner.email,
        isAdmin: owner.isAdmin,
        token: generateToken(owner._id),
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.log(error);

    // Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        message: `${field} already exists. Please use a different one.`,
      });
    }

    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/* --- Login --- */
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const owner = await BusinessOwner.findOne({ email });

    if (owner && (await owner.matchPassword(password))) {
      res.json({
        _id: owner._id,
        email: owner.email,
        isAdmin: owner.isAdmin,
        token: generateToken(owner._id),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

/* --- Forgot Password --- */
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  let owner;

  try {
    owner = await BusinessOwner.findOne({ email });

    if (!owner) {
      return res
        .status(404)
        .json({ message: "No account found with that email" });
    }

    const resetToken = owner.getResetPasswordToken();
    await owner.save({ validateBeforeSave: false });

    // Reset link (frontend)
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const message = `
      <h1>You have requested a password reset</h1>
      <p>Please go to this link to reset your password:</p>
      <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
      <p>This link will expire in 10 minutes.</p>
    `;

    try {
      await sendEmail({
        email: owner.email,
        subject: "Password Reset Request",
        message: message,
      });

      res.status(200).json({
        success: true,
        message: "Email sent successfully! Check your inbox.",
      });
    } catch (err) {
      console.error(err);

      // Clear token if email fails
      owner.resetPasswordToken = undefined;
      owner.resetPasswordExpire = undefined;
      await owner.save({ validateBeforeSave: false });

      return res.status(500).json({ message: "Email could not be sent" });
    }
  } catch (error) {
    console.error(error);

    if (owner) {
      owner.resetPasswordToken = undefined;
      owner.resetPasswordExpire = undefined;
      await owner.save({ validateBeforeSave: false });
    }

    res.status(500).json({ message: "Server Error" });
  }
};

/* --- Reset Password --- */
exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    // Hash token from URL
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const owner = await BusinessOwner.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!owner) {
      return res.status(400).json({ message: "Invalid or Expired Token" });
    }

    // Set new password
    owner.password = password;

    // Clear reset fields
    owner.resetPasswordToken = undefined;
    owner.resetPasswordExpire = undefined;

    await owner.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
      token: generateToken(owner._id),
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
