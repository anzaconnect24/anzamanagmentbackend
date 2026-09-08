const { errorResponse, successResponse } = require("../../utils/responses");
const { Slide, User, Module, SlideReader } = require("../../models");
const { logModuleStart } = require("../../utils/activity_logger");
const { sendEmail } = require("../../utils/send_email");
const { response } = require("express");

// A content item inside a lesson. lesson_uuid is the current form;
// module_uuid still works for the callers that predate lessons, and the item
// then lands on that module's first lesson.
// A slide inside a module. lesson_uuid is still accepted from older callers
// and simply ignored: slides hang off their module directly.
const createSlide = async (req, res) => {
  try {
    const {
      content,
      title,
      module_uuid,
      file,
      type,
      url,
      durationSeconds,
      thumbnail,
      description,
      downloadable,
    } = req.body;

    const module = await Module.findOne({ where: { uuid: module_uuid } });

    if (!module) {
      return res
        .status(404)
        .json({ status: false, message: "Module not found" });
    }

    if (type && !Slide.TYPES.includes(type)) {
      return res.status(400).json({
        status: false,
        message: "Content type must be one of " + Slide.TYPES.join(", "),
      });
    }

    const position = await Slide.count({ where: { moduleId: module.id } });

    const response = await Slide.create({
      content,
      title,
      file,
      type: type || "text",
      url: url || null,
      durationSeconds: Number.isFinite(Number(durationSeconds))
        ? Number(durationSeconds)
        : null,
      thumbnail: thumbnail || null,
      description: description || null,
      downloadable: downloadable !== false,
      moduleId: module.id,
      position,
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
