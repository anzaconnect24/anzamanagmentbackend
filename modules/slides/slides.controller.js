const { errorResponse, successResponse } = require("../../utils/responses");
const { Slide, User, Module, SlideReader } = require("../../models");
const { logModuleStart } = require("../../utils/activity_logger");
const { sendEmail } = require("../../utils/send_email");
const { response } = require("express");

const createSlide = async (req, res) => {
  try {
    const { content, title, module_uuid, file, type } = req.body;
    const module = await Module.findOne({
      where: {
        uuid: module_uuid,
      },
    });
    console.log(req.body);
    const response = await Slide.create({
      content,
      title,
      file,
      type,
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
    const user = req.user;
    console.log(slide_uuid);

    const slide = await Slide.findOne({
      where: {
        uuid: slide_uuid,
      },
      include: [Module],
    });

    if (!slide) {
      return res.status(404).json({ message: "Slide not found" });
    }

    // Check if already marked as read
    const existingRead = await SlideReader.findOne({
      where: {
        slideId: slide.id,
        userId: user.id,
      },
    });

    let response;
    if (!existingRead) {
      // Create new slide reader entry
      response = await SlideReader.create({
        slideId: slide.id,
        userId: user.id,
      });

      // Log module start (will only log once per module)
      await logModuleStart(
        user.id,
        slide.Module.id,
        slide.Module.title || slide.Module.course,
        user.name
      );
    } else {
      response = existingRead;
    }

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
      order: [["createdAt"]],
      distinct: true,
      attributes: {
        exclude: ["ModuleId"],
      },
      include: [
        {
          model: SlideReader,
          where: {
            userId: req.user.id,
          },
          required: false,
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
