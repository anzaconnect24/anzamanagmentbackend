const { errorResponse, successResponse } = require("../../utils/responses");
const { InvestmentOpportunity, User } = require("../../models");
const { sendEmail } = require("../../utils/send_email");
const { where } = require("sequelize");

const createInvestmentOpportunity = async (req, res) => {
  try {
    const { title, description, image, url } = req.body;
    var response = await InvestmentOpportunity.create({
      title,
      description,
      image,
      url,
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateInvestmentOpportunity = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const investmentopportunity = await InvestmentOpportunity.findOne({
      where: {
        uuid,
      },
    });
    const response = await investmentopportunity.update(req.body);
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteInvestmentOpportunity = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const investmentopportunity = await InvestmentOpportunity.findOne({
      where: {
        uuid,
      },
    });
    const response = await investmentopportunity.destroy();
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const getAllInvestmentOpportunities = async (req, res) => {
  // res.status(200).json({"k":"v"});
  try {
    let { page, limit } = req.query;

    const { count, rows } = await InvestmentOpportunity.findAndCountAll({
      offset: req.offset, //ruka ngapi
      limit: req.limit, //leta ngapi
      order: [["createdAt", "DESC"]],
      where: {
        title: {
          [where.like]: `%${req.keyword}%`,
        },
      },
    });
    successResponse(res, { count, data: rows, page: req.page });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getInvestmentOpportunityDetails = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const response = await InvestmentOpportunity.findOne({
      where: { uuid },
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  createInvestmentOpportunity,
  updateInvestmentOpportunity,
  deleteInvestmentOpportunity,
  getAllInvestmentOpportunities,
  getInvestmentOpportunityDetails,
};
