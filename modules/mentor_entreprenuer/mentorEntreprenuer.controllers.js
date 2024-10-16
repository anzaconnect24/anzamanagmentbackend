const { errorResponse, successResponse } = require("../../utils/responses");
const { MentorEntreprenuer, User } = require("../../models");
const { sendEmail } = require("../../utils/send_email");

const createMentorEntreprenuer = async (req, res) => {
  try {
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
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteMentorEntreprenuer = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const MentorEntreprenuer = await MentorEntreprenuer.findOne({
      where: {
        uuid,
      },
    });
    const response = await MentorEntreprenuer.destroy();
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  createMentorEntreprenuer,
  deleteMentorEntreprenuer,
};
