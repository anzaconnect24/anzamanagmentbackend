const { errorResponse, successResponse } = require("../../utils/responses");
const getUrl = require("../../utils/cloudinary_upload");
const {
  BusinessInvestmentRequest,
  BusinessInvestmentRequestReview,
  User,
  Business,
  Sequelize,
  ProgramRequirement,
  Program,
  BusinessInvestmentRequestDocument,
  InvestorProfile,
  Notification,
} = require("../../models");
const { sendEmail } = require("../../utils/send_email");
const { where, Op } = require("sequelize");

const createBusinessInvestmentRequest = async (req, res) => {
  try {
    let {
      business_uuid,
      currency,
      investmentAmount,
      investmentType,
      dueDiligenceDate,
      helpFromAnza,
      additionalInfo,
      investor_uuid,
    } = req.body;
    const user = req.user;
    const business = await Business.findOne({
      where: { uuid: business_uuid },
    });

    // Find investor if investor_uuid is provided
    let investor = null;
    if (investor_uuid) {
      investor = await User.findOne({
        where: { uuid: investor_uuid },
      });
    }

    const response = await BusinessInvestmentRequest.create({
      userId: user.id,
      investmentAmount,
      investmentType,
      currency,
      dueDiligenceDate,
      additionalInfo,
      helpFromAnza,
      businessId: business.id,
      investorId: investor ? investor.id : null,
    });

    // Send notification to investor if specified
    if (investor) {
      await Notification.create({
        to: "Investor",
        userId: investor.id,
        message: `${user.firstName} ${user.lastName} has submitted an investment request for ${business.name}`,
      });
    }

    admin = await User.findOne({ where: { role: "Admin" } });
    sendEmail(req, res, admin, "business_investment_request");
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const postBusinessInvestmentRequestDocument = async (req, res) => {
  try {
    const user = req.user; // Move this line to after getting user object
    let program_application_uuid = req.params.uuid;
    let fileLink = null;
    let { program_requirement_uuid } = req.body;

    if (req.file) {
      fileLink = await getUrl(req);
    }

    const program_application = await BusinessInvestmentRequest.findOne({
      where: {
        uuid: program_application_uuid,
      },
    });
    const program_requirement = await ProgramRequirement.findOne({
      where: {
        uuid: program_requirement_uuid,
      },
    });

    const response = await BusinessInvestmentRequestDocument.create({
      programRequirementId: program_requirement.id,
      fileLink: fileLink,
      fileName: program_requirement.name,
      BusinessInvestmentRequestId: program_application.id,
    });

    successResponse(res, response);
  } catch (error) {
    console.log(error);
    errorResponse(res, error);
  }
};

const getUserBusinessInvestmentRequest = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const user = req.user;
    const business = await Business.findOne({
      where: {
        uuid,
      },
    });
    const response = await BusinessInvestmentRequest.findOne({
      [Op.and]: [
        {
          where: {
            userId: user.id,
          },
          where: {
            businessId: business.uuid,
          },
        },
      ],
      attributes: {
        exclude: ["UserId", "BusinessId", "userId", "businessId"],
      },
      include: [
        {
          model: User,
          include: [InvestorProfile],
        },
        Business,
      ],
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateBusinessInvestmentRequest = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const { status } = req.body;
    const businessInvestmentRequest = await BusinessInvestmentRequest.findOne({
      where: {
        uuid,
      },
    });
    //find user
    const user = await User.findOne({
      where: { id: businessInvestmentRequest.userId },
    });
    sendEmail(req, res, user, status);
    const response = await businessInvestmentRequest.update(req.body);
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteBusinessInvestmentRequest = async (req, res) => {
  try {
    let { name } = req.body;
    const uuid = req.params.uuid;
    const businessInvestmentRequest = await BusinessInvestmentRequest.findOne({
      where: {
        uuid,
      },
    });
    const response = await businessInvestmentRequest.destroy();
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteProgramRequirement = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const ProgramRequirement = await ProgramRequirement.findOne({
      where: {
        uuid,
      },
    });
    const response = await ProgramRequirement.destroy();
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const getAllBusinessInvestmentRequests = async (req, res) => {
  // res.status(200).json({"k":"v"});
  try {
    let { page, limit, status } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;
    const user = req.user;

    // Build where clause for filtering
    const whereClause = {};
    if (status) {
      whereClause.status = status;
    }

    const { count, rows } = await BusinessInvestmentRequest.findAndCountAll({
      offset: offset, //ruka ngapi
      limit: limit, //leta ngapi
      order: [["createdAt", "DESC"]],
      // distinct:true,
      where: whereClause,
      include: [
        {
          model: User,
          as: "investor",
          include: InvestorProfile,
        },
        {
          model: Business,
          required: true,
          where: {
            userId: user.id, // Filter by entrepreneur's businesses
          },
        },
      ],
    });
    const totalPages =
      count % limit > 0 ? parseInt(count / limit) + 1 : parseInt(count / limit);
    successResponse(res, { count, data: rows, page, totalPages });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getInvestorWaitingBusinessInvestmentRequests = async (req, res) => {
  // res.status(200).json({"k":"v"});
  try {
    let { page, limit } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;
    const user = req.user;

    const { count, rows } = await BusinessInvestmentRequest.findAndCountAll({
      offset: offset, //ruka ngapi
      limit: limit, //leta ngapi
      order: [["createdAt", "DESC"]],
      // distinct:true,
      attributes: {
        exclude: ["UserId"],
      },
      where: {
        userId: user.id,
        status: "waiting",
      },
      include: [
        {
          model: User,
          as: "investor",
          include: InvestorProfile,
        },
        Business,
      ],
    });
    const totalPages =
      count % limit > 0 ? parseInt(count / limit) + 1 : parseInt(count / limit);
    successResponse(res, { count, data: rows, page, totalPages });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getInvestorClosedBusinessInvestmentRequests = async (req, res) => {
  // res.status(200).json({"k":"v"});
  try {
    let { page, limit } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;
    const user = req.user;

    const { count, rows } = await BusinessInvestmentRequest.findAndCountAll({
      offset: offset, //ruka ngapi
      limit: limit, //leta ngapi
      order: [["createdAt", "DESC"]],
      // distinct:true,
      attributes: {
        exclude: ["UserId"],
      },
      where: {
        userId: user.id,
        status: "closed",
      },
      include: [
        {
          model: User,
          as: "investor",
          include: InvestorProfile,
        },
        Business,
      ],
    });
    const totalPages =
      count % limit > 0 ? parseInt(count / limit) + 1 : parseInt(count / limit);
    successResponse(res, { count, data: rows, page, totalPages });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getWaitingBusinessInvestmentRequests = async (req, res) => {
  try {
    let { page, limit } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const response = await BusinessInvestmentRequest.findAll({});

    const { count, rows } = await BusinessInvestmentRequest.findAndCountAll({
      offset: offset, //ruka ngapi
      limit: limit, //leta ngapi
      order: [["createdAt", "DESC"]],
      distinct: true,
      where: { status: "waiting" },
      include: [
        {
          model: User,
          as: "investor",
          // include:[InvestorProfile]
        },
        Business,
      ],
    });
    const totalPages =
      count % limit > 0 ? parseInt(count / limit) + 1 : parseInt(count / limit);
    successResponse(res, { count, data: rows, page, totalPages });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getAcceptedBusinessInvestmentRequests = async (req, res) => {
  try {
    let { page, limit } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const { count, rows } = await BusinessInvestmentRequest.findAndCountAll({
      offset: offset, //ruka ngapi
      limit: limit, //leta ngapi
      order: [["createdAt", "DESC"]],
      // distinct:true,
      where: { status: "accepted" },
      include: [
        {
          model: User,
          as: "investor",
          include: InvestorProfile,
        },
        Business,
      ],
    });
    const totalPages =
      count % limit > 0 ? parseInt(count / limit) + 1 : parseInt(count / limit);
    successResponse(res, { count, data: rows, page, totalPages });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getRejectedBusinessInvestmentRequests = async (req, res) => {
  try {
    let { page, limit } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const { count, rows } = await BusinessInvestmentRequest.findAndCountAll({
      offset: offset, //ruka ngapi
      limit: limit, //leta ngapi
      order: [["createdAt", "DESC"]],
      // distinct:true,
      where: { status: "rejected" },
      include: [
        {
          model: User,
          as: "investor",
          include: InvestorProfile,
        },
        Business,
      ],
    });
    const totalPages =
      count % limit > 0 ? parseInt(count / limit) + 1 : parseInt(count / limit);
    successResponse(res, { count, data: rows, page, totalPages });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getBusinessInvestmentRequestDetails = async (req, res) => {
  try {
    const uuid = req.params.uuid;

    const response = await BusinessInvestmentRequest.findOne({
      where: { uuid },
      attributes: {
        exclude: ["userId", "businessId"],
      },
      include: [
        {
          model: User,
          as: "investor",
          include: [InvestorProfile],
        },
        {
          model: Business,
        },
      ],
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const getReviewersStatus = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    let { page, limit } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;
    const businessInvestmentRequest = await BusinessInvestmentRequest.findOne({
      where: {
        uuid,
      },
    });
    const { count, rows } = await User.findAndCountAll({
      offset: offset, //ruka ngapi
      limit: limit, //leta ngapi
      order: [["createdAt", "DESC"]],

      where: { role: "Reviewer" },
      include: [
        {
          model: BusinessInvestmentRequestReview,
          where: {
            businessInvestmentRequestId: businessInvestmentRequest.id,
          },
          required: false,
        },
      ],
      attributes: {
        // exclude:["BusinessId"],
        include: [
          [
            Sequelize.literal(`EXISTS(
                            SELECT *
                            FROM BusinessInvestmentRequestReviews AS businessInvestmentRequestReview
                            WHERE
                                userId = User.id
                        )`),
            "status",
          ],
        ],
      },
    });
    const totalPages =
      count % limit > 0 ? parseInt(count / limit) + 1 : parseInt(count / limit);
    successResponse(res, { count, data: rows, page, totalPages });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Get all investment requests for a specific investor
const getInvestorInvestmentRequests = async (req, res) => {
  try {
    let { page, limit, status } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const offset = (page - 1) * limit;
    const investor = req.user;

    let whereClause = {
      investorId: investor.id,
    };

    // Filter by status if provided
    if (status) {
      whereClause.status = status;
    }

    const { count, rows } = await BusinessInvestmentRequest.findAndCountAll({
      offset: offset,
      limit: limit,
      order: [["createdAt", "DESC"]],
      where: whereClause,
      include: [
        {
          model: User,
          as: "entrepreneur",
          include: [InvestorProfile],
        },
        Business,
      ],
    });
    const totalPages =
      count % limit > 0 ? parseInt(count / limit) + 1 : parseInt(count / limit);
    successResponse(res, { count, data: rows, page, totalPages });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Approve investment request (investor shows interest)
const approveInvestmentRequest = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const investor = req.user;

    const investmentRequest = await BusinessInvestmentRequest.findOne({
      where: { uuid },
      include: [
        {
          model: User,
          as: "entrepreneur",
        },
        Business,
      ],
    });

    if (!investmentRequest) {
      return errorResponse(res, { message: "Investment request not found" });
    }

    // Update status to in-progress
    await investmentRequest.update({
      status: "in-progress",
      investorId: investor.id,
    });

    // Create notification for entrepreneur
    await Notification.create({
      to: "Entrepreneur",
      userId: investmentRequest.entrepreneur.id,
      message: `${investor.firstName} ${investor.lastName} has shown interest in your investment request for ${investmentRequest.Business.name}`,
    });

    successResponse(res, investmentRequest);
  } catch (error) {
    errorResponse(res, error);
  }
};

// Reject investment request
const rejectInvestmentRequest = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const investor = req.user;
    const { reason } = req.body;

    const investmentRequest = await BusinessInvestmentRequest.findOne({
      where: { uuid },
      include: [
        {
          model: User,
          as: "entrepreneur",
        },
        Business,
      ],
    });

    if (!investmentRequest) {
      return errorResponse(res, { message: "Investment request not found" });
    }

    // Update status to rejected
    await investmentRequest.update({
      status: "rejected",
      feedback: reason || "Investment request rejected",
    });

    // Create notification for entrepreneur
    await Notification.create({
      to: "Entrepreneur",
      userId: investmentRequest.entrepreneur.id,
      message: `${investor.firstName} ${investor.lastName} has rejected your investment request for ${investmentRequest.Business.name}`,
    });

    successResponse(res, investmentRequest);
  } catch (error) {
    errorResponse(res, error);
  }
};

// Complete investment (mark as completed)
const completeInvestment = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const investor = req.user;

    const investmentRequest = await BusinessInvestmentRequest.findOne({
      where: { uuid },
      include: [
        {
          model: User,
          as: "entrepreneur",
        },
        Business,
      ],
    });

    if (!investmentRequest) {
      return errorResponse(res, { message: "Investment request not found" });
    }

    // Update status to completed
    await investmentRequest.update({
      status: "completed",
    });

    // Create notification for entrepreneur
    await Notification.create({
      to: "Entrepreneur",
      userId: investmentRequest.entrepreneur.id,
      message: `Investment process completed for ${investmentRequest.Business.name}`,
    });

    successResponse(res, investmentRequest);
  } catch (error) {
    errorResponse(res, error);
  }
};

// Get in-progress investments
const getInProgressInvestments = async (req, res) => {
  try {
    let { page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const offset = (page - 1) * limit;
    const investor = req.user;

    const { count, rows } = await BusinessInvestmentRequest.findAndCountAll({
      offset: offset,
      limit: limit,
      order: [["createdAt", "DESC"]],
      where: {
        investorId: investor.id,
        status: "in-progress",
      },
      include: [
        {
          model: User,
          as: "entrepreneur",
          include: [InvestorProfile],
        },
        Business,
      ],
    });
    const totalPages =
      count % limit > 0 ? parseInt(count / limit) + 1 : parseInt(count / limit);
    successResponse(res, { count, data: rows, page, totalPages });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Get dropped investments (rejected)
const getDroppedInvestments = async (req, res) => {
  try {
    let { page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const offset = (page - 1) * limit;
    const investor = req.user;

    const { count, rows } = await BusinessInvestmentRequest.findAndCountAll({
      offset: offset,
      limit: limit,
      order: [["createdAt", "DESC"]],
      where: {
        investorId: investor.id,
        status: "rejected",
      },
      include: [
        {
          model: User,
          as: "entrepreneur",
          include: [InvestorProfile],
        },
        Business,
      ],
    });
    const totalPages =
      count % limit > 0 ? parseInt(count / limit) + 1 : parseInt(count / limit);
    successResponse(res, { count, data: rows, page, totalPages });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Get completed investments
const getCompletedInvestments = async (req, res) => {
  try {
    let { page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const offset = (page - 1) * limit;
    const investor = req.user;

    const { count, rows } = await BusinessInvestmentRequest.findAndCountAll({
      offset: offset,
      limit: limit,
      order: [["createdAt", "DESC"]],
      where: {
        investorId: investor.id,
        status: "completed",
      },
      include: [
        {
          model: User,
          as: "entrepreneur",
          include: [InvestorProfile],
        },
        Business,
      ],
    });
    const totalPages =
      count % limit > 0 ? parseInt(count / limit) + 1 : parseInt(count / limit);
    successResponse(res, { count, data: rows, page, totalPages });
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  createBusinessInvestmentRequest,
  updateBusinessInvestmentRequest,
  deleteBusinessInvestmentRequest,
  getUserBusinessInvestmentRequest,
  getAllBusinessInvestmentRequests,
  getReviewersStatus,
  getWaitingBusinessInvestmentRequests,
  getAcceptedBusinessInvestmentRequests,
  getRejectedBusinessInvestmentRequests,
  getBusinessInvestmentRequestDetails,
  deleteProgramRequirement,
  postBusinessInvestmentRequestDocument,
  getInvestorWaitingBusinessInvestmentRequests,
  getInvestorClosedBusinessInvestmentRequests,
  getInvestorInvestmentRequests,
  approveInvestmentRequest,
  rejectInvestmentRequest,
  completeInvestment,
  getInProgressInvestments,
  getDroppedInvestments,
  getCompletedInvestments,
};

// Entrepreneur approves investor's investment request
const entrepreneurApproveInvestorRequest = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const entrepreneur = req.user;

    const investmentRequest = await BusinessInvestmentRequest.findOne({
      where: { uuid, userId: entrepreneur.id },
      include: [
        {
          model: User,
          as: "investor",
        },
        Business,
      ],
    });

    if (!investmentRequest) {
      return errorResponse(res, {
        message: "Investment request not found or unauthorized",
      });
    }

    // Update status to accepted
    await investmentRequest.update({
      status: "accepted",
    });

    // Create notification for investor
    if (investmentRequest.investorId) {
      await Notification.create({
        to: "Investor",
        userId: investmentRequest.investorId,
        message: `Your investment request for ${investmentRequest.Business.name} has been approved by the entrepreneur`,
      });
    }

    successResponse(res, investmentRequest);
  } catch (error) {
    errorResponse(res, error);
  }
};

// Entrepreneur rejects investor's investment request
const entrepreneurRejectInvestorRequest = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const entrepreneur = req.user;
    const { reason } = req.body;

    const investmentRequest = await BusinessInvestmentRequest.findOne({
      where: { uuid, userId: entrepreneur.id },
      include: [
        {
          model: User,
          as: "investor",
        },
        Business,
      ],
    });

    if (!investmentRequest) {
      return errorResponse(res, {
        message: "Investment request not found or unauthorized",
      });
    }

    // Update status to rejected
    await investmentRequest.update({
      status: "rejected",
      feedback: reason || "Investment request declined by entrepreneur",
    });

    // Create notification for investor
    if (investmentRequest.investorId) {
      await Notification.create({
        to: "Investor",
        userId: investmentRequest.investorId,
        message: `Your investment request for ${investmentRequest.Business.name} has been declined`,
      });
    }

    successResponse(res, investmentRequest);
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  createBusinessInvestmentRequest,
  updateBusinessInvestmentRequest,
  deleteBusinessInvestmentRequest,
  getUserBusinessInvestmentRequest,
  getAllBusinessInvestmentRequests,
  getReviewersStatus,
  getWaitingBusinessInvestmentRequests,
  getAcceptedBusinessInvestmentRequests,
  getRejectedBusinessInvestmentRequests,
  getBusinessInvestmentRequestDetails,
  deleteProgramRequirement,
  postBusinessInvestmentRequestDocument,
  getInvestorWaitingBusinessInvestmentRequests,
  getInvestorClosedBusinessInvestmentRequests,
  getInvestorInvestmentRequests,
  approveInvestmentRequest,
  rejectInvestmentRequest,
  completeInvestment,
  getInProgressInvestments,
  getDroppedInvestments,
  getCompletedInvestments,
  entrepreneurApproveInvestorRequest,
  entrepreneurRejectInvestorRequest,
};
