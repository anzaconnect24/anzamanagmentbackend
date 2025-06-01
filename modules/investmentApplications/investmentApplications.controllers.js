const { errorResponse, successResponse } = require("../../utils/responses");
const { InvestmentApplication, User } = require("../../models");

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
    const { count, rows } = await InvestmentApplication.findAndCountAll({
      offset: req.offset,
      limit: req.limit,
      order: [["createdAt", "DESC"]],
      attributes: {
        exclude: ["id"],
      },
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
        exclude: ["id"],
      },
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

module.exports = {
  createInvestmentApplication,
  getInvestmentApplication,
  getAllInvestmentApplications,
  deleteInvestmentApplication,
  updateInvestmentApplication,
};
