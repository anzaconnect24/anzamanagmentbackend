const { errorResponse, successResponse } = require("../../utils/responses");
const { Module, User, Slide, SlideReader, Program } = require("../../models");
const { sendEmail } = require("../../utils/send_email");
const program = require("../../models/program");

const createModule = async (req, res) => {
  try {
    const { title, program_uuid, image, description } = req.body;
    console.log(req.body);
    const program = await Program.findOne({
      where: {
        uuid: program_uuid,
      },
    });
    const response = await Module.create({
      title,
      programId: program.id,
      image,
      description,
    });
    console.log(response);
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
    const { program_uuid } = req.query;
    const program = await Program.findOne({
      where: {
        uuid: program_uuid,
      },
    });
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
        programId: program.id,
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
