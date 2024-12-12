const { errorResponse, successResponse } = require("../../utils/responses");
const {
  MentorEntreprenuer,
  User,
  Business,
  BusinessSector,
} = require("../../models");
const { sendEmail } = require("../../utils/send_email");

const createMentorEntreprenuer = async (req, res) => {
  try {
    const user = req.user;
    const { mentor_uuid, entreprenuer_uuid } = req.body;
    const mentor = await User.findOne({
      where: {
        uuid: mentor_uuid,
      },
    });
    const entreprenuer = await User.findOne({
      where: {
        uuid: entreprenuer_uuid,
      },
    });

    const response = await MentorEntreprenuer.create({
      mentorId: mentor.id,
      entreprenuerId: entreprenuer.id,
      approved: user.role == "Mentor" ? false : true,
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};
const getMentorEntreprenuers = async (req, res) => {
  try {
    const { uuid } = req.params;
    const mentor = await User.findOne({
      where: {
        uuid,
      },
    });

    const response = await MentorEntreprenuer.findAll({
      attributes: ["id", "uuid", "mentorId", "entreprenuerId", "createdAt"],
      where: {
        mentorId: mentor.id,
      },
      include: [
        {
          model: User,
          as: "Entreprenuer",
          include: [
            {
              model: Business,
              include: [BusinessSector],
            },
          ],
        },
      ],
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};
const getEntreprenuerMentors = async (req, res) => {
  try {
    const { uuid } = req.params;
    const entreprenuer = await User.findOne({
      where: {
        uuid,
      },
    });

    const response = await MentorEntreprenuer.findAll({
      attributes: ["id", "uuid", "mentorId", "entreprenuerId", "createdAt"],
      where: {
        entreprenuerId: entreprenuer.id,
      },
      include: [
        {
          model: User,
          as: "Mentor",
        },
      ],
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};
const getUnapprovedMentorEntreprenuers = async (req, res) => {
  try {
    const response = await MentorEntreprenuer.findAll({
      attributes: [
        "id",
        "uuid",
        "mentorId",
        "approved",
        "entreprenuerId",
        "createdAt",
      ],
      where: {
        approved: false,
      },
      include: [
        {
          model: User,
          as: "Entreprenuer",
          include: [
            {
              model: Business,
              include: [BusinessSector],
            },
          ],
        },
        {
          model: User,
          as: "Mentor",
        },
      ],
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};
const deleteMentorEntreprenuer = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const mentorEntreprenuer = await MentorEntreprenuer.findOne({
      where: {
        uuid,
      },
    });
    const response = await mentorEntreprenuer.destroy();
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};
const updateMentorEntreprenuer = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const mentorEntreprenuer = await MentorEntreprenuer.findOne({
      where: {
        uuid,
      },
    });
    const response = await mentorEntreprenuer.update(req.body);
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  createMentorEntreprenuer,
  getMentorEntreprenuers,
  getEntreprenuerMentors,
  updateMentorEntreprenuer,
  getUnapprovedMentorEntreprenuers,
  deleteMentorEntreprenuer,
};
