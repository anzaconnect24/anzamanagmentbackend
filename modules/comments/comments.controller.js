const { errorResponse, successResponse } = require("../../utils/responses");
const { Comment, User, Module, Slide } = require("../../models");
const { sendEmail } = require("../../utils/send_email");

const createComment = async (req, res) => {
  try {
    const { module_uuid, slide_uuid, message } = req.body;

    let payload = { message, userId: req.user.id };
    if (slide_uuid) {
      const slide = await Slide.findOne({
        where: {
          uuid: slide_uuid,
        },
      });
      payload.slideId = slide.id;
    }

    if (module_uuid) {
      const module = await Module.findOne({
        where: {
          uuid: module_uuid,
        },
      });
      payload.moduleId = module.id;
    }

    const response = await Comment.create(payload);
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateComment = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const comment = await Comment.findOne({
      where: {
        uuid,
      },
    });
    const response = await comment.update(req.body);
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteComment = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const comment = await Comment.findOne({
      where: {
        uuid,
      },
    });
    const response = await comment.destroy();
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const getComments = async (req, res) => {
  try {
    const { module_uuid, slide_uuid } = req.query;
    let filter = {};
    if (slide_uuid) {
      const slide = await Slide.findOne({
        where: {
          uuid: slide_uuid,
        },
      });
      filter.slideId = slide.id;
    }

    if (module_uuid) {
      const module = await Module.findOne({
        where: {
          uuid: module_uuid,
        },
      });
      filter.moduleId = module.id;
    }
    const { count, rows } = await Comment.findAndCountAll({
      offset: req.offset,
      limit: req.limit,
      order: [["createdAt", "DESC"]],
      distinct: true,
      where: filter,
    });
    successResponse(res, { count, data: rows, page: req.page });
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  createComment,
  updateComment,
  deleteComment,
  getComments,
};
