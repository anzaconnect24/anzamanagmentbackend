const { errorResponse, successResponse } = require("../../utils/responses");
const { Program } = require("../../models");

const createProgram = async (req, res) => {
  try {
    let { title, description, image, url } = req.body;
    var response = await Program.create({
      title: title,
      description: description,
      image: image,
      url: url,
    });

    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateProgram = async (req, res) => {
  try {
    const uuid = req.params.uuid;
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
    const { count, rows } = await Program.findAndCountAll({
      offset: req.offset, //ruka ngapi
      limit: req.limit, //leta ngapi
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
