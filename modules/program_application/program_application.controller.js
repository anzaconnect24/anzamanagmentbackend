const { errorResponse, successResponse } = require("../../utils/responses");
const { ProgramApplication } = require("../../models");
const { Op } = require("sequelize");

const createProgramApplication = async (req, res) => {
  try {
    let { title, description, image, url } = req.body;

    const response = await ProgramApplication.create({
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

const getProgramApplication = async (req, res) => {
  try {
    const uuid = req.params.uuid;

    const response = await ProgramApplication.findOne({
      where: {
        uuid,
      },
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateProgramApplication = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const programApplication = await ProgramApplication.findOne({
      where: {
        uuid,
      },
    });
    const response = await programApplication.update(req.body);
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteProgramApplication = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const programApplication = await ProgramApplication.findOne({
      where: {
        uuid,
      },
    });
    const response = await programApplication.destroy();
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const getAllProgramApplications = async (req, res) => {
  // res.status(200).json({"k":"v"});
  try {
    const { count, rows } = await ProgramApplication.findAndCountAll({
      offset: req.offset, //ruka ngapi
      limit: req.limit, //leta ngapi
      order: [["createdAt", "DESC"]],
      where: {
        title: {
          [Op.like]: `%${req.keyword}%`,
        },
      },
    });
    successResponse(res, { count, data: rows, page: req.page });
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  createProgramApplication,
  updateProgramApplication,
  deleteProgramApplication,
  getAllProgramApplications,
  getProgramApplication,
};
