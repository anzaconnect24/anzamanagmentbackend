const { errorResponse, successResponse } = require("../../utils/responses");
const {
  Notification,
  User,
  NotificationViewer,
  Sequelize,
} = require("../../models");
const { sendEmail } = require("../../utils/send_email");
const { Op } = require("sequelize");

const createNotification = async (req, res) => {
  try {
    const { user_uuid, message, to } = req.body;
    console.log(req.body);
    let user;
    if (user_uuid) {
      user = await User.findOne({
        where: {
          uuid: user_uuid,
        },
      });
    }
    const response = await Notification.create({
      to,
      message,
      userId: user_uuid && user.id,
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const addNotificationViewer = async (req, res) => {
  try {
    const { uuid } = req.params;
    const user = req.user;
    var response = await NotificationViewer.create({
      notificationId: uuid,
      userId: user.id,
    });
    console.log(response);
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const getUnreadNotifications = async (req, res) => {
  try {
    const { role, id } = req.user;
    const notifications = await Notification.findAll({
      order: [["createdAt", "DESC"]],
      limit: 5,
      where: {
        [Op.or]: [
          {
            to: role,
          },
          {
            userId: id,
          },
        ],
      },
    });

    successResponse(res, notifications);
  } catch (error) {
    errorResponse(res, error);
  }
};

const getAllNotifications = async (req, res) => {
  try {
    const user = req.user;
    const notifications = await Notification.findAll();

    successResponse(res, notifications);
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { uuid } = req.params;
    const notification = await Notification.findOne({
      uuid,
    });
    const response = await notification.destroy();
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};
module.exports = {
  createNotification,
  getUnreadNotifications,
  addNotificationViewer,
  getAllNotifications,
  deleteNotification,
};
