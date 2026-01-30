const { errorResponse, successResponse } = require("../../utils/responses");
const { InvestmentApplication, User } = require("../../models");
const { Op } = require("sequelize");

const createInvestmentApplication = async (req, res) => {
  user = req.user;
  try {
    const {
      investor_uuid,
      amount,
      purposeOfInvestment,
      pitchdeck,
      offerToInvestor,
    } = req.body;
    const investor = await User.findOne({
      where: {
        uuid: investor_uuid,
      },
    });

    const response = await InvestmentApplication.create({
      investorId: investor.id,
      entreprenuerId: req.user.id,
      amount,
      purposeOfInvestment,
      pitchdeck,
      offerToInvestor,
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const getAllInvestmentApplications = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    console.log("User ID:", userId);
    console.log("Fetching investment applications for role:", req.user);
    console.log("User Role:", userRole);
    // Build where clause based on user role
    let whereClause = {};

    // If user is an entrepreneur, only show their applications
    if (userRole === "Enterprenuer") {
      whereClause.entreprenuerId = userId;
    }
    // If user is an investor, show applications to them
    else if (userRole === "Investor") {
      whereClause.investorId = userId;
    }
    // Admin can see all applications

    const { count, rows } = await InvestmentApplication.findAndCountAll({
      where: whereClause,
      offset: req.offset,
      limit: req.limit,
      order: [["createdAt", "DESC"]],
      attributes: {
        exclude: ["id", "investorId", "entreprenuerId"],
      },
      include: [
        {
          model: User,
          as: "Investor",
          attributes: ["uuid", "name", "email", "phone"],
        },
        {
          model: User,
          as: "Entrepreneur",
          attributes: ["uuid", "name", "email", "phone"],
        },
      ],
    });
    successResponse(res, { count, data: rows, page: req.page });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getInvestmentApplication = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const response = await InvestmentApplication.findOne({
      where: {
        uuid,
      },
      attributes: {
        exclude: ["id", "investorId", "entreprenuerId"],
      },
      include: [
        {
          model: User,
          as: "Investor",
          attributes: ["uuid", "name", "email", "phone"],
        },
        {
          model: User,
          as: "Entrepreneur",
          attributes: ["uuid", "name", "email", "phone"],
        },
      ],
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateInvestmentApplication = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const investmentapplication = await InvestmentApplication.findOne({
      where: {
        uuid,
      },
    });
    const response = await investmentapplication.update(req.body);
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteInvestmentApplication = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const investmentApplication = await InvestmentApplication.findOne({
      where: {
        uuid,
      },
    });
    const response = await investmentApplication.destroy();
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

// Investor shows interest in entrepreneur's application
const investorShowInterest = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const userId = req.user.id;

    const application = await InvestmentApplication.findOne({
      where: { uuid },
    });

    if (!application) {
      return errorResponse(res, { message: "Application not found" });
    }

    // Verify the investor is the recipient of this application
    if (application.investorId !== userId) {
      return errorResponse(res, { message: "Unauthorized" });
    }

    const response = await application.update({
      investorStatus: "interested",
      respondedAt: new Date(),
    });

    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

// Investor approves application (moves to in_progress)
const investorApproveApplication = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const userId = req.user.id;
    const { investorResponse } = req.body;

    const application = await InvestmentApplication.findOne({
      where: { uuid },
    });

    if (!application) {
      return errorResponse(res, { message: "Application not found" });
    }

    if (application.investorId !== userId) {
      return errorResponse(res, { message: "Unauthorized" });
    }

    const response = await application.update({
      investorStatus: "approved",
      status: "in_progress",
      investorResponse,
      respondedAt: new Date(),
    });

    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

// Investor rejects application (moves to dropped)
const investorRejectApplication = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const userId = req.user.id;
    const { investorResponse } = req.body;

    const application = await InvestmentApplication.findOne({
      where: { uuid },
    });

    if (!application) {
      return errorResponse(res, { message: "Application not found" });
    }

    if (application.investorId !== userId) {
      return errorResponse(res, { message: "Unauthorized" });
    }

    const response = await application.update({
      investorStatus: "rejected",
      status: "dropped",
      investorResponse,
      respondedAt: new Date(),
    });

    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

// Mark investment as completed
const markInvestmentCompleted = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const userId = req.user.id;

    const application = await InvestmentApplication.findOne({
      where: { uuid },
    });

    if (!application) {
      return errorResponse(res, { message: "Application not found" });
    }

    // Either investor or entrepreneur can mark as completed
    if (
      application.investorId !== userId &&
      application.entreprenuerId !== userId
    ) {
      return errorResponse(res, { message: "Unauthorized" });
    }

    const response = await application.update({
      status: "completed",
    });

    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

// Get entrepreneurs who sent investment applications to this investor
const getInterestedEntrepreneurs = async (req, res) => {
  try {
    const userId = req.user.id;

    const { count, rows } = await InvestmentApplication.findAndCountAll({
      where: {
        investorId: userId,
      },
      offset: req.offset,
      limit: req.limit,
      order: [["createdAt", "DESC"]],
      attributes: {
        exclude: ["id", "investorId", "entreprenuerId"],
      },
      include: [
        {
          model: User,
          as: "Entrepreneur",
          attributes: ["uuid", "name", "email", "phone", "profile_picture"],
          required: true,
        },
      ],
      group: ["entreprenuerId"],
    });

    successResponse(res, { count, data: rows, page: req.page });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Get interested investors for entrepreneur's businesses
const getInterestedInvestors = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const whereClause = {
      entreprenuerId: userId,
      investorStatus: {
        [Op.ne]: "pending", // Not pending means investor has shown interest
      },
    };

    if (status) {
      whereClause.investorStatus = status;
    }

    const { count, rows } = await InvestmentApplication.findAndCountAll({
      where: whereClause,
      offset: req.offset,
      limit: req.limit,
      order: [["createdAt", "DESC"]],
      attributes: {
        exclude: ["id", "investorId", "entreprenuerId"],
      },
      include: [
        {
          model: User,
          as: "Investor",
          required: true,
        },
      ],
    });

    successResponse(res, { count, data: rows, page: req.page });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Entrepreneur approves investor's interest
const entrepreneurApproveInvestor = async (req, res) => {
  try {
    const { uuid } = req.params;
    const userId = req.user.id;

    const application = await InvestmentApplication.findOne({
      where: {
        uuid,
        entreprenuerId: userId,
      },
    });

    if (!application) {
      return errorResponse(res, "Investment application not found", 404);
    }

    // Update investor status to approved
    application.investorStatus = "approved";
    application.investorResponse = "Entrepreneur approved your interest";
    application.respondedAt = new Date();
    await application.save();

    successResponse(res, application);
  } catch (error) {
    errorResponse(res, error);
  }
};

// Entrepreneur rejects investor's interest
const entrepreneurRejectInvestor = async (req, res) => {
  try {
    const { uuid } = req.params;
    const userId = req.user.id;

    const application = await InvestmentApplication.findOne({
      where: {
        uuid,
        entreprenuerId: userId,
      },
    });

    if (!application) {
      return errorResponse(res, "Investment application not found", 404);
    }

    // Update investor status to rejected
    application.investorStatus = "rejected";
    application.investorResponse = "Entrepreneur declined your interest";
    application.respondedAt = new Date();
    await application.save();

    successResponse(res, application);
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  createInvestmentApplication,
  getInvestmentApplication,
  getAllInvestmentApplications,
  deleteInvestmentApplication,
  updateInvestmentApplication,
  investorShowInterest,
  investorApproveApplication,
  investorRejectApplication,
  markInvestmentCompleted,
  getInterestedEntrepreneurs,
  getInterestedInvestors,
  entrepreneurApproveInvestor,
  entrepreneurRejectInvestor,
};
