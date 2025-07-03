const { errorResponse, successResponse } = require("../../utils/responses");
const { Slide, User, Module } = require("../../models");
const { sendEmail } = require("../../utils/send_email");

const createSlide = async (req, res) => {
  try {
    const { content, title, module_uuid } = req.body;
    const module = await Module.findOne({
      where: {
        uuid: module_uuid,
      },
    });
    const response = await Slide.create({
      content,
      title,
      moduleId: module.id,
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateSlide = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const slide = await Slide.findOne({
      where: {
        uuid,
      },
    });
    const response = await slide.update(req.body);
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteSlide = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const slide = await Slide.findOne({
      where: {
        uuid,
      },
    });
    const response = await slide.destroy();
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const getSlides = async (req, res) => {
  try {
    const { module_uuid } = req.query;
    const module = await Module.findOne({
      where: {
        uuid: module_uuid,
      },
    });
    const { count, rows } = await Slide.findAndCountAll({
      offset: req.offset,
      limit: req.limit,
      order: [["createdAt", "DESC"]],
      distinct: true,
      where: {
        moduleId: module.id,
      },
    });
    successResponse(res, { count, data: rows, page: req.page });
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  createSlide,
  updateSlide,
  deleteSlide,
  getSlides,
};
