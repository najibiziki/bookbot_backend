const Business = require("../models/Business");
const BusinessOwner = require("../models/BusinessOwner");

// exports.resetBilling = async (req, res) => {
//   try {
//     const { phoneId } = req.body;

//     if (!phoneId) {
//       return res.status(400).json({ message: "Please provide phoneId" });
//     }

//     const business = await Business.findOne({ phoneId });

//     if (!business) {
//       return res.status(404).json({ message: "Business not found" });
//     }

//     business.billing.conversationsThisMonth = 0;
//     business.billing.uniqueClientsThisMonth = 0;
//     business.billing.estimatedCostThisMonth = 0;
//     business.billing.nextResetDate = null;

//     await business.save();

//     res.json({
//       success: true,
//       message: `Billing reset for ${business.name}`,
//       data: business.billing,
//     });
//   } catch (error) {
//     console.error("Error resetting billing:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// exports.getAllUsers = async (req, res) => {
//   try {
//     const users = await BusinessOwner.find({}).select("-password");
//     res.json(users);
//   } catch (error) {
//     res.status(500).json({ message: "Server Error" });
//   }
// };

// exports.updateUserStatus = async (req, res) => {
//   try {
//     const user = await BusinessOwner.findById(req.params.id);

//     if (user) {
//       user.isOnTrial = req.body.isOnTrial ?? user.isOnTrial;
//       user.hasPaid = req.body.hasPaid ?? user.hasPaid;

//       if (req.body.extendTrialDays) {
//         user.trialEndsAt = new Date(
//           Date.now() + req.body.extendTrialDays * 24 * 60 * 60 * 1000,
//         );
//       }

//       const updatedUser = await user.save();
//       res.json(updatedUser);
//     } else {
//       res.status(404).json({ message: "User not found" });
//     }
//   } catch (error) {
//     res.status(500).json({ message: "Server Error" });
//   }
// };

// @desc    Get all businesses (Admin only)
// @route   GET /api/admin/businesses
exports.getAllBusinesses = async (req, res) => {
  try {
    const businesses = await Business.find({})
      .select("name owner phoneNumber ownerId billing createdAt")
      .populate("ownerId", "isActive isOnTrial trialEndsAt paidUntil")
      .sort({ createdAt: -1 });

    res.status(200).json(businesses);
  } catch (error) {
    console.error("Error fetching businesses:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Update Access Token for ALL businesses
// @route   PUT /api/admin/token
exports.updateAllTokens = async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ message: "Access Token is required" });
    }

    await Business.updateMany({}, { accessToken: accessToken });

    res.status(200).json({ message: "All access tokens updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Update Business Owner Status (Active/Trial)
// @route   PUT /api/admin/status/:ownerId
exports.updateOwnerStatus = async (req, res) => {
  try {
    const { ownerId } = req.params;
    const { isActive, isOnTrial } = req.body;

    const owner = await BusinessOwner.findById(ownerId);
    if (!owner) return res.status(404).json({ message: "Owner not found" });

    if (isActive === true) {
      owner.isActive = true;
      if (owner.isOnTrial) owner.isOnTrial = false;
      const oneMonth = 30 * 24 * 60 * 60 * 1000;
      owner.paidUntil = new Date(Date.now() + oneMonth);
    } else {
      owner.isActive = isActive;
    }

    await owner.save();
    res.status(200).json({ message: "Status updated", owner });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

exports.deleteBusiness = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    // Security: Allow Owner OR Admin to delete
    const user = await BusinessOwner.findById(req.user._id);

    const isOwner =
      user &&
      user.businessId &&
      user.businessId.toString() === business._id.toString();
    const isAdmin = req.user.isAdmin;

    if (!isOwner && !isAdmin) {
      return res.status(401).json({ message: "Not authorized" });
    }

    await business.deleteOne();

    // If it was the owner deleting their own business, clear their ID
    if (isOwner) {
      user.businessId = null;
      await user.save();
    }

    res.status(200).json({ message: "Business removed" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};
