const { errorResponse, successResponse } = require("../../utils/responses");
const { SuccessStory, User, Business } = require("../../models");
const { sendEmail } = require("../../utils/send_email");
const getUrl = require("../../utils/cloudinary_upload");

const createSuccessStory = async (req, res) => {
  try {
    const { title, description, videoLink } = req.body;
    var response = await SuccessStory.create({
      title,
      description,
      videoLink,
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateSuccessStory = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const successStory = await SuccessStory.findOne({
      where: {
        uuid,
      },
    });
    const response = await successStory.update(req.body);
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteSuccessStory = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const successStory = await SuccessStory.findOne({
      where: {
        uuid,
      },
    });
    const response = await successStory.destroy();
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const getAllSuccessStorys = async (req, res) => {
  try {
    const { count, rows } = await SuccessStory.findAndCountAll({
      offset: req.offset, //ruka ngapi
      limit: req.limit, //leta ngapi
      order: [["createdAt", "DESC"]],
    });

    successResponse(res, { count, data: rows, page: req.page });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getSuccessStoryDetails = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const response = await SuccessStory.findOne({
      where: { uuid },
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  createSuccessStory,
  updateSuccessStory,
  deleteSuccessStory,
  getAllSuccessStorys,
  getSuccessStoryDetails,
};
