const { User, Conversation } = require("../../models");
const { Op } = require("sequelize");
const { successResponse, errorResponse } = require("../../utils/responses");
const { directContact } = require("../../utils/capital_gate");
const createConversation = async (req, res) => {
  try {
    const { lastMessage, to, type } = req.body;
    const fromUser = req.user;
    const toUser = await User.findOne({
      where: {
        uuid: to,
      },
    });
    if (!toUser) {
      return res.status(404).json({ status: false, message: "User not found" });
    }
    // Startups and investors reach each other through capital facilitation
    // until Anza has approved an introduction and moved it to direct contact.
    const gate = await directContact(fromUser, toUser);
    if (!gate.allowed) {
      return res.status(403).json({ status: false, message: gate.message });
    }
    const conversation = await Conversation.findOne({
      where: {
        [Op.and]: [
          {
            from: fromUser.id,
          },
          {
            to: toUser.id,
          },
        ],
      },
    });
    let response;
    if (conversation === null) {
      response = await Conversation.create({
        type,
        lastMessage,
        from: fromUser.id,
        to: toUser.id,
      });
    } else {
      response = conversation;
    }

    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};
const getUserConversations = async (req, res) => {
  try {
    const user = req.user;
    const response = await Conversation.findAll({
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: User,
          as: "user1",
          required: true,
        },
        {
          model: User,
          as: "user2",
          required: true,
        },
      ],
      where: {
        [Op.or]: [
          {
            from: user.id,
          },
          {
            to: user.id,
          },
        ],
      },
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteConversation = async (req, res) => {
  try {
    const { uuid } = req.params;
    const conversation = await Conversation.findOne({
      where: {
        uuid,
      },
    });
    const response = await conversation.destroy();
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};
module.exports = {
  createConversation,
  getUserConversations,
  deleteConversation,
};
