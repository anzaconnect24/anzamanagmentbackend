const { errorResponse, successResponse } = require("../../utils/responses");
const { MentorProfile, User } = require("../../models");

const createMentorProfile = async (req, res) => {
  try {
    const {
      user_uuid,
      linkedinURL,
      position,
      organisation,
      areasOfExperties,
      mentorAvailability,
      mentorHours,
      mentoringFormat,
      description,
    } = req.body;
    const user = await User.findOne({
      where: {
        uuid: user_uuid,
      },
    });
    console.log(req.body);
    console.log(user);
    const response = await MentorProfile.create({
      userId: user.id,
      linkedinURL,
      position,
      organisation,
      areasOfExperties,
      mentorAvailability,
      mentorHours,
      mentoringFormat,
      description,
    });
    successResponse(res, response);
  } catch (error) {
    console.log(error);
    errorResponse(res, error);
  }
};

const updateMentorProfile = async (req, res) => {
  try {
    let { name } = req.body;
    const uuid = req.params.uuid;
    const mentorprofile = await MentorProfile.findOne({
      where: {
        uuid,
      },
    });
    const response = await mentorprofile.update({
      name,
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteMentorProfile = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const mentorprofile = await MentorProfile.findOne({
      where: {
        uuid,
      },
    });
    const response = await mentorprofile.destroy();
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const getMentorProfile = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const response = await MentorProfile.findAll({
      where: {
        uuid,
      },
    });

    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  createMentorProfile,
  updateMentorProfile,
  getMentorProfile,
  deleteMentorProfile,
};
