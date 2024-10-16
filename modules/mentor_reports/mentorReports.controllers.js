const { errorResponse, successResponse } = require("../../utils/responses");
const { MentorReport, User } = require("../../models");
const { sendEmail } = require("../../utils/send_email");
const getUrl = require("../../utils/cloudinary_upload");

const createMentorReport = async (req, res) => {
  try {
    const { mentor_uuid, entreprenuer_uuid, title, description } = req.body;
    const url = getUrl(req);
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

    const response = await MentorReport.create({
      mentorId: mentor.id,
      entreprenuerId: entreprenuer.id,
      url: url,
      title,
      description,
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};
const getMentorReports = async (req, res) => {
  try {
    const { uuid } = req.params;
    const mentor = await User.findOne({
      where: {
        uuid,
      },
    });

    const response = await MentorReport.findAll({
      where: {
        mentorId: mentor.id,
      },
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};
const getEntreprenuerReports = async (req, res) => {
  try {
    const { uuid } = req.body;
    const entreprenuer = await User.findOne({
      where: {
        uuid,
      },
    });
    const response = await MentorReport.findAll({
      where: {
        entreprenuerId: entreprenuer.id,
      },
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteMentorReport = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const MentorReport = await MentorReport.findOne({
      where: {
        uuid,
      },
    });
    const response = await MentorReport.destroy();
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  createMentorReport,
  getMentorReports,
  getEntreprenuerReports,
  deleteMentorReport,
};
