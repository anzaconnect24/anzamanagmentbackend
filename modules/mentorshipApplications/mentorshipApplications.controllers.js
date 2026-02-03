const { errorResponse, successResponse } = require("../../utils/responses");
const {
  MentorshipApplication,
  User,
  MentorProfile,
  Notification,
} = require("../../models");
const { Op } = require("sequelize");

const createMentorshipApplication = async (req, res) => {
  user = req.user;
  try {
    const {
      mentor_uuid,
      challenges,
      mentorshipAreas,
      mentorshipModes,
      availability,
    } = req.body;
    const mentor = await User.findOne({
      where: {
        uuid: mentor_uuid,
      },
    });

    const response = await MentorshipApplication.create({
      mentorId: mentor.id,
      entreprenuerId: req.user.id,
      challenges,
      mentorshipAreas,
      mentorshipModes,
      availability,
    });

    // Send notification to mentor
    await Notification.create({
      userId: mentor.id,
      to: "Mentor",
      message: `${req.user.name} has submitted a mentorship application. Please review it in your dashboard.`,
    });

    // Send notification to admin
    await Notification.create({
      to: "Admin",
      message: `New mentorship application from ${req.user.name} to ${mentor.name}.`,
    });

    console.log(response);
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const getAllMentorshipApplications = async (req, res) => {
  try {
    const { count, rows } = await MentorshipApplication.findAndCountAll({
      offset: req.offset,
      limit: req.limit,
      order: [["createdAt", "DESC"]],
      attributes: {
        exclude: ["id"],
      },
    });
    successResponse(res, { count, data: rows, page: req.page });
  } catch (error) {
    errorResponse(res, error);
  }
};
const getEntreprenuerMentorshipApplications = async (req, res) => {
  try {
    const { uuid } = req.params;
    const user = await User.findOne({
      where: {
        uuid,
      },
    });
    const { count, rows } = await MentorshipApplication.findAndCountAll({
      offset: req.offset,
      limit: req.limit,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: User,
          as: "mentor",
          where: {
            name: {
              [Op.like]: `%${req.keyword}%`,
            },
          },
          include: [MentorProfile],
        },
        {
          model: User,
          as: "entrepreneur",
          where: {
            id: user.id,
          },
          required: true,
        },
      ],
      attributes: {
        exclude: ["id"],
      },
    });

    successResponse(res, { count, data: rows, page: req.page });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getMentorshipApplication = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const response = await MentorshipApplication.findOne({
      where: {
        uuid,
      },
      attributes: {
        exclude: ["id" /*,"uuid","name","createdAt","updatedAt"*/],
      },
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateMentorshipApplication = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const mentorshipapplication = await MentorshipApplication.findOne({
      where: {
        uuid,
      },
    });
    const response = await mentorshipapplication.update(req.body);
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteMentorshipApplication = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const mentorshipApplication = await MentorshipApplication.findOne({
      where: {
        uuid,
      },
    });
    const response = await mentorshipApplication.destroy();
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

// Set up Google Meet link and appointment date
const setupMeeting = async (req, res) => {
  try {
    const { uuid } = req.params;
    const { googleMeetLink, appointmentDate } = req.body;

    const mentorshipApplication = await MentorshipApplication.findOne({
      where: { uuid },
      include: [
        {
          model: User,
          as: "entrepreneur",
        },
        {
          model: User,
          as: "mentor",
        },
      ],
    });

    if (!mentorshipApplication) {
      return errorResponse(res, "Mentorship application not found", 404);
    }

    // Update with Google Meet link and appointment date
    await mentorshipApplication.update({
      googleMeetLink,
      appointmentDate,
      appointmentStatus: "pending",
    });

    // Send notification to entrepreneur
    await Notification.create({
      userId: mentorshipApplication.entrepreneur.id,
      to: "Enterprenuer",
      message: `Your mentor ${mentorshipApplication.mentor.name} has scheduled a meeting for ${new Date(appointmentDate).toLocaleDateString()}. Please check your mentorship dashboard to accept.`,
    });

    successResponse(res, {
      message: "Meeting scheduled successfully",
      mentorshipApplication,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Mentee accepts appointment
const acceptAppointment = async (req, res) => {
  try {
    const { uuid } = req.params;

    const mentorshipApplication = await MentorshipApplication.findOne({
      where: { uuid },
      include: [
        {
          model: User,
          as: "entrepreneur",
        },
        {
          model: User,
          as: "mentor",
        },
      ],
    });

    if (!mentorshipApplication) {
      return errorResponse(res, "Mentorship application not found", 404);
    }

    // Update mentee acceptance
    await mentorshipApplication.update({
      menteeAccepted: true,
      appointmentStatus: "accepted",
    });

    // Send notification to mentor
    await Notification.create({
      userId: mentorshipApplication.mentor.id,
      to: "Mentor",
      message: `${mentorshipApplication.entrepreneur.name} has accepted the meeting scheduled for ${new Date(mentorshipApplication.appointmentDate).toLocaleDateString()}.`,
    });

    successResponse(res, {
      message: "Appointment accepted successfully",
      mentorshipApplication,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  createMentorshipApplication,
  getMentorshipApplication,
  getAllMentorshipApplications,
  deleteMentorshipApplication,
  getEntreprenuerMentorshipApplications,
  updateMentorshipApplication,
  setupMeeting,
  acceptAppointment,
};
