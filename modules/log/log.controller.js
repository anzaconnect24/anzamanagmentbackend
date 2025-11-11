const { errorResponse, successResponse } = require("../../utils/responses");
const { Log, User } = require("../../models");
const { sendEmail } = require("../../utils/send_email");
const { getUserActivityLogs } = require("../../utils/activity_logger");

const createLog = async (req, res) => {
  try {
    const { action } = req.body;
    let user = await req.user;
    var response = await Log.create({ action: action, userId: user.id });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const getUserLog = async (req, res) => {
  try {
    const user = req.user;
    const response = await Log.findOne({
      where: {
        userId: user.id,
      },
      include: {
        model: business,
        required: true,
      },
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateLog = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const { status } = req.body;
    const log = await Log.findOne({
      where: {
        uuid,
      },
    });
    //find user

    if (status) {
      const user = await User.findOne({
        where: { id: log.userId },
      });
      sendEmail(req, res, user, status);
    }
    const response = await Log.update(req.body);
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteLog = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const log = await Log.findOne({
      where: {
        uuid,
      },
    });
    const response = await log.destroy();
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const getAllLogs = async (req, res) => {
  // res.status(200).json({"k":"v"});
  try {
    let { page, limit } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;
    const { count, rows } = await Log.findAndCountAll({
      offset: offset, //ruka ngapi
      limit: limit, //leta ngapi
      order: [["createdAt", "DESC"]],
      // distinct:true,
      include: {
        model: User,
        // required: true,
      },
    });
    const totalPages =
      count % limit > 0 ? parseInt(count / limit) + 1 : parseInt(count / limit);
    successResponse(res, { count, data: rows, page, totalPages });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getLogDetails = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    let user = req.user;

    const response = await Log.findOne({
      where: { uuid },
      include: {
        model: User,
        // required: true,
      },
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const getLogsByUserId = async (req, res) => {
  try {
    const { user_uuid } = req.params;
    const { page = 1, limit = 50, startDate, endDate } = req.query;

    // Find user by UUID
    const user = await User.findOne({
      where: { uuid: user_uuid },
    });

    if (!user) {
      return errorResponse(res, { message: "User not found" });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, logs } = await getUserActivityLogs(user.id, {
      limit: parseInt(limit),
      offset,
      startDate,
      endDate,
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    successResponse(res, {
      count,
      data: logs,
      page: parseInt(page),
      totalPages,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  createLog,
  updateLog,
  deleteLog,
  getUserLog,
  getAllLogs,
  getLogDetails,
  getLogsByUserId,
};
