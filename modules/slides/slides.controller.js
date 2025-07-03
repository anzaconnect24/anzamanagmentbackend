const { errorResponse, successResponse } = require("../../utils/responses");
const { Slide, User, Module, SlideReader } = require("../../models");
const { sendEmail } = require("../../utils/send_email");
const { response } = require("express");

const createSlide = async (req, res) => {
  try {
    const { content, title, module_uuid } = req.body;
    const module = await Module.findOne({
      where: {
        uuid: module_uuid,
      },
    });
    console.log(req.body);
    const response = await Slide.create({
      content,
      title,
      moduleId: module.id,
    });
    successResponse(res, { ...response });
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
const markRead = async (req, res) => {
  try {
    const { slide_uuid } = req.body;
    const slide = await Slide.findOne({
      where: {
        uuid: slide_uuid,
      },
    });
    const response = SlideReader.create({
      slideId: slide.id,
      userId: req.user.id,
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const getSlides = async (req, res) => {
  try {
    const { module_uuid } = req.query;
    console.log(module_uuid);
    const module = await Module.findOne({
      where: {
        uuid: module_uuid,
      },
    });
    console.log(module);
    const { count, rows } = await Slide.findAndCountAll({
      offset: req.offset,
      limit: req.limit,
      order: [["createdAt"]],
      distinct: true,
      include: [
        {
          SlideReader,
          where: {
            userId: req.user.id,
          },
        },
      ],
      where: {
        moduleId: module.id,
      },
    });
    successResponse(res, { count, data: rows, page: req.page, module });
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  createSlide,
  updateSlide,
  deleteSlide,
  getSlides,
  markRead,
};
