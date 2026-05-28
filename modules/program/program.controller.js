const { errorResponse, successResponse } = require("../../utils/responses");
const { Program } = require("../../models");
const { Op } = require("sequelize");

const createProgram = async (req, res) => {
  try {
    let { title, description, image, programCategory, startDate, endDate } =
      req.body;

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        status: false,
        message: "Program start date cannot be after end date",
      });
    }

    var response = await Program.create({
      title: title,
      description: description,
      image: image,
      programCategory: programCategory,
      startDate: startDate || null,
      endDate: endDate || null,
    });

    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateProgram = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const { startDate, endDate } = req.body;

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        status: false,
        message: "Program start date cannot be after end date",
      });
    }

    const program = await Program.findOne({
      where: {
        uuid,
      },
    });

    const response = await program.update(req.body);
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteProgram = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const program = await Program.findOne({
      where: {
        uuid,
      },
    });
    const response = await program.destroy();
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const getAllPrograms = async (req, res) => {
  try {
    const { programCategory } = req.query;
    const whereClause = {};

    if (programCategory) {
      whereClause.programCategory = programCategory;
    }

    const { count, rows } = await Program.findAndCountAll({
      where: whereClause,
      offset: req.offset,
      limit: req.limit,
      order: [["createdAt", "DESC"]],
    });
    successResponse(res, { count, data: rows, page: req.page });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getProgramDetails = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const response = await Program.findOne({
      where: { uuid },
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  createProgram,
  updateProgram,
  deleteProgram,
  getAllPrograms,
  getProgramDetails,
};
