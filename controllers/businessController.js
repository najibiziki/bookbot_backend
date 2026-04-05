const Business = require("../models/Business");
const BusinessOwner = require("../models/BusinessOwner");

// @desc    Create new Business
// @route   POST /api/business
exports.createBusiness = async (req, res) => {
  try {
    const {
      name,
      owner,
      phoneNumber,
      description,
      timezone,
      workingPeriods,
      staff,
      services,
      slotStepMinutes,
      phoneId,
    } = req.body;

    const user = await BusinessOwner.findById(req.user._id);
    if (user.businessId) {
      return res
        .status(400)
        .json({ message: "You already have a business profile." });
    }

    const business = await Business.create({
      name,
      owner,
      ownerId: req.user._id,
      phoneNumber,
      description,
      timezone,
      workingPeriods,
      staff,
      services,
      slotStepMinutes,
      phoneId,
    });

    user.businessId = business._id;
    await user.save();

    res.status(201).json(business);
  } catch (error) {
    console.error("Error creating business:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get logged in user's business
// @route   GET /api/business/mybusiness
exports.getMyBusiness = async (req, res) => {
  try {
    const user = await BusinessOwner.findById(req.user._id);
    if (!user || !user.businessId) {
      return res.status(404).json({ message: "Business not found" });
    }
    const business = await Business.findById(user.businessId);
    res.status(200).json(business);
  } catch (error) {
    console.error("Error fetching business:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Get single business by ID (Admin or Owner)
// @route   GET /api/business/:id
exports.getBusinessById = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business)
      return res.status(404).json({ message: "Business not found" });
    res.status(200).json(business);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Update Business
// @route   PUT /api/business/:id
exports.updateBusiness = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business)
      return res.status(404).json({ message: "Business not found" });

    // Security Check
    if (req.user.isAdmin) {
      // Admin allowed
    } else {
      const user = await BusinessOwner.findById(req.user._id);
      if (
        !user ||
        !user.businessId ||
        user.businessId.toString() !== business._id.toString()
      ) {
        return res.status(401).json({ message: "Not authorized" });
      }
    }

    // Update Fields
    const fields = [
      "name",
      "owner",
      "description",
      "timezone",
      "workingPeriods",
      "slotStepMinutes",
      "staff",
      "services",
      "phoneNumber",
    ];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) business[field] = req.body[field];
    });

    if (req.user.isAdmin && req.body.phoneId !== undefined) {
      business.phoneId = req.body.phoneId;
    }

    const updatedBusiness = await business.save();
    res.status(200).json(updatedBusiness);
  } catch (error) {
    console.error("Error updating business:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
