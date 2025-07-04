const { errorResponse, successResponse } = require("../../utils/responses");
const { Module, User, Slide, SlideReader } = require("../../models");
const { sendEmail } = require("../../utils/send_email");

const createModule = async (req, res) => {
  try {
    const { title, course, image, description } = req.body;

    const response = await Module.create({
      title,
      course,
      image,
      description,
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateModule = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const module = await Module.findOne({
      where: {
        uuid,
      },
    });
    const response = await module.update(req.body);
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const getModule = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    console.log(uuid);
    const module = await Module.findOne({
      where: {
        uuid,
      },
    });
    successResponse(res, module);
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteModule = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const module = await Module.findOne({
      where: {
        uuid,
      },
    });
    const response = await module.destroy();
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const getModules = async (req, res) => {
  try {
    const { course } = req.query;
    const { count, rows } = await Module.findAndCountAll({
      offset: req.offset,
      limit: req.limit,
      order: [["createdAt", "DESC"]],
      distinct: true,
      include: [
        {
          model: Slide,
          required: false,
          include: [
            {
              model: SlideReader,
              where: {
                userId: req.user.id,
              },
              required: false,
            },
          ],
        },
      ],
      where: {
        course,
      },
    });
    successResponse(res, { count, data: rows, page: req.page });
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  createModule,
  updateModule,
  deleteModule,
  getModules,
  getModule,
};
