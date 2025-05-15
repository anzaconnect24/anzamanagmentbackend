const { errorResponse, successResponse } = require("../../utils/responses");
const getUrl = require("../../utils/cloudinary_upload");
const {
  InvestorProfile,
  User,
  BusinessSector,
  Business,
  Sequelize,
  ProgramRequirement,
  Program,
  InvestorProfileDocument,
} = require("../../models");
const { sendEmail } = require("../../utils/send_email");
const { where } = require("sequelize");

const createInvestorProfile = async (req, res) => {
  try {
    let {
      company,
      role,
      sector,
      geography,
      ticketSize,
      // structure,
      //added attributes
      linkedinURL,
      website,
      investmentFocus,
      investmentSize,
      investmentType,
      bio,
      notableInvestment,
      preferMentoring,
      portifolioDocument,
      user_uuid,
    } = req.body;

    const sectorData = await BusinessSector.findOne({
      where: {
        uuid: sector,
      },
    });
    const user = await User.findOne({
      where: {
        uuid: user_uuid,
      },
    });
    const response = await InvestorProfile.create({
      userId: user.id,
      role,
      company,
      BusinessSectorId: sectorData.id,
      ticketSize,
      geography,
      //   structure,
      //added attributes
      linkedinURL,
      website,
      investmentFocus,
      investmentSize,
      investmentType,
      bio,
      notableInvestment,
      preferMentoring,
      portifolioDocument,
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const postInvestorProfileDocument = async (req, res) => {
  try {
    const user = req.user; // Move this line to after getting user object
    let program_application_uuid = req.params.uuid;
    let fileLink = null;
    let { program_requirement_uuid } = req.body;

    if (req.file) {
      fileLink = await getUrl(req);
    }

    const program_application = await InvestorProfile.findOne({
      where: {
        uuid: program_application_uuid,
      },
    });
    const program_requirement = await ProgramRequirement.findOne({
      where: {
        uuid: program_requirement_uuid,
      },
    });

    const response = await InvestorProfileDocument.create({
      programRequirementId: program_requirement.id,
      fileLink: fileLink,
      fileName: program_requirement.name,
      InvestorProfileId: program_application.id,
    });

    successResponse(res, response);
  } catch (error) {
    console.log(error);
    errorResponse(res, error);
  }
};

const getUserInvestorProfile = async (req, res) => {
  try {
    const user = req.user;
    const response = await InvestorProfile.findOne({
      where: {
        userId: user.id,
      },
      include: {
        model: User,
        required: true,
      },
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateInvestorProfile = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const { status } = req.body;
    const investorProfile = await InvestorProfile.findOne({
      where: {
        uuid,
      },
    });
    //find user
    const user = await User.findOne({
      where: { id: investorProfile.userId },
    });
    sendEmail(req, res, user, status);
    const response = await investorProfile.update(req.body);
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const user = req.user;
    const investorProfile = await InvestorProfile.findOne({
      where: {
        userId: user.id,
      },
    });
    const response = await investorProfile.update(req.body);
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteInvestorProfile = async (req, res) => {
  try {
    let { name } = req.body;
    const uuid = req.params.uuid;
    const investorProfile = await InvestorProfile.findOne({
      where: {
        uuid,
      },
    });
    const response = await investorProfile.destroy();
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

const getAllInvestorProfiles = async (req, res) => {
  // res.status(200).json({"k":"v"});
  try {
    let { page, limit } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const { count, rows } = await InvestorProfile.findAndCountAll({
      offset: offset, //ruka ngapi
      limit: limit, //leta ngapi
      order: [["createdAt", "DESC"]],
      // distinct:true,
      include: {
        model: User,
        // required: true,
      },
    });
    const totalPages =
      count % limit > 0 ? parseInt(count / limit) + 1 : parseInt(count / limit);
    successResponse(res, { count, data: rows, page, totalPages });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getWaitingInvestorProfiles = async (req, res) => {
  try {
    let { page, limit } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const { count, rows } = await InvestorProfile.findAndCountAll({
      offset: offset, //ruka ngapi
      limit: limit, //leta ngapi
      order: [["createdAt", "DESC"]],
      // distinct:true,
      where: { status: "waiting" },
      include: [User, Program],
    });
    const totalPages =
      count % limit > 0 ? parseInt(count / limit) + 1 : parseInt(count / limit);
    successResponse(res, { count, data: rows, page, totalPages });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getAcceptedInvestorProfiles = async (req, res) => {
  try {
    let { page, limit } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const { count, rows } = await InvestorProfile.findAndCountAll({
      offset: offset, //ruka ngapi
      limit: limit, //leta ngapi
      order: [["createdAt", "DESC"]],
      // distinct:true,
      where: { status: "accepted" },
      include: [User, Program],
    });
    const totalPages =
      count % limit > 0 ? parseInt(count / limit) + 1 : parseInt(count / limit);
    successResponse(res, { count, data: rows, page, totalPages });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getRejectedInvestorProfiles = async (req, res) => {
  try {
    let { page, limit } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const { count, rows } = await InvestorProfile.findAndCountAll({
      offset: offset, //ruka ngapi
      limit: limit, //leta ngapi
      order: [["createdAt", "DESC"]],
      // distinct:true,
      where: { status: "rejected" },
      include: [User, Program],
    });
    const totalPages =
      count % limit > 0 ? parseInt(count / limit) + 1 : parseInt(count / limit);
    successResponse(res, { count, data: rows, page, totalPages });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getInvestorProfileDetails = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const response = await InvestorProfile.findOne({
      where: { uuid },
      attributes: {
        exclude: ["userId", "programId"],
      },
      include: [User],
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const getMyProfileDetails = async (req, res) => {
  try {
    const user = req.user;
    const response = await InvestorProfile.findOne({
      where: { userId: user.id },
      attributes: {
        exclude: ["userId", "programId"],
      },
      include: [User, BusinessSector],
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

    const { count, rows } = await User.findAndCountAll({
      offset: offset, //ruka ngapi
      limit: limit, //leta ngapi
      order: [["createdAt", "DESC"]],
      distinct: true,
      where: { role: "Reviewer" },
      include: {
        model: InvestorProfile,
        where: { uuid },
        required: true,
      },
      // include:{
      //     model: InvestorProfile,
      //     // required: true
      // },
      attributes: {
        // exclude:["BusinessId"],
        include: [
          [
            Sequelize.literal(`(
                            SELECT count(*)
                            FROM InvestorProfileReview AS InvestorProfileReview
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

module.exports = {
  createInvestorProfile,
  updateInvestorProfile,
  deleteInvestorProfile,
  getUserInvestorProfile,
  getAllInvestorProfiles,
  getReviewersStatus,
  getWaitingInvestorProfiles,
  getAcceptedInvestorProfiles,
  getRejectedInvestorProfiles,
  getInvestorProfileDetails,
  deleteProgramRequirement,
  postInvestorProfileDocument,
  getMyProfileDetails,
  updateMyProfile,
};
