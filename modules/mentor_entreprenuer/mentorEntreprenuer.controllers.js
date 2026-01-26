const { errorResponse, successResponse } = require("../../utils/responses");
const {
  MentorEntreprenuer,
  User,
  Business,
  BusinessSector,
  Notification,
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

    // Send notification to mentor
    await Notification.create({
      userId: mentor.id,
      to: "Mentor",
      message: `You have been assigned to mentor ${entreprenuer.name}. Please set up a meeting in your dashboard.`,
    });

    // Send notification to entrepreneur
    await Notification.create({
      userId: entreprenuer.id,
      to: "Enterprenuer",
      message: `${mentor.name} has been assigned as your mentor. You will receive a meeting invitation soon.`,
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

// Set up Google Meet link and appointment date
const setupMeeting = async (req, res) => {
  try {
    const { uuid } = req.params;
    const { googleMeetLink, appointmentDate } = req.body;

    const mentorEntreprenuer = await MentorEntreprenuer.findOne({
      where: { uuid },
      include: [
        {
          model: User,
          as: "Entreprenuer",
        },
        {
          model: User,
          as: "Mentor",
        },
      ],
    });

    if (!mentorEntreprenuer) {
      return errorResponse(res, "Mentorship relationship not found", 404);
    }

    // Update with Google Meet link and appointment date
    await mentorEntreprenuer.update({
      googleMeetLink,
      appointmentDate,
      appointmentStatus: "pending",
    });

    // Send notification to entrepreneur
    await Notification.create({
      userId: mentorEntreprenuer.Entreprenuer.id,
      to: "Enterprenuer",
      message: `Your mentor ${mentorEntreprenuer.Mentor.name} has scheduled a meeting for ${new Date(appointmentDate).toLocaleDateString()}. Please check your mentorship dashboard.`,
    });

    successResponse(res, {
      message: "Meeting scheduled successfully",
      mentorship: mentorEntreprenuer,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Mentee accepts appointment
const acceptAppointment = async (req, res) => {
  try {
    const { uuid } = req.params;

    const mentorEntreprenuer = await MentorEntreprenuer.findOne({
      where: { uuid },
      include: [
        {
          model: User,
          as: "Entreprenuer",
        },
        {
          model: User,
          as: "Mentor",
        },
      ],
    });

    if (!mentorEntreprenuer) {
      return errorResponse(res, "Mentorship relationship not found", 404);
    }

    // Update mentee acceptance
    await mentorEntreprenuer.update({
      menteeAccepted: true,
      appointmentStatus: "accepted",
    });

    // Send notification to mentor
    await Notification.create({
      userId: mentorEntreprenuer.Mentor.id,
      to: "Mentor",
      message: `${mentorEntreprenuer.Entreprenuer.name} has accepted the meeting scheduled for ${new Date(mentorEntreprenuer.appointmentDate).toLocaleDateString()}.`,
    });

    successResponse(res, {
      message: "Appointment accepted successfully",
      mentorship: mentorEntreprenuer,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Reject appointment
const rejectAppointment = async (req, res) => {
  try {
    const { uuid } = req.params;
    const { reason } = req.body;

    const mentorEntreprenuer = await MentorEntreprenuer.findOne({
      where: { uuid },
      include: [
        {
          model: User,
          as: "Entreprenuer",
        },
        {
          model: User,
          as: "Mentor",
        },
      ],
    });

    if (!mentorEntreprenuer) {
      return errorResponse(res, "Mentorship relationship not found", 404);
    }

    // Update appointment status
    await mentorEntreprenuer.update({
      appointmentStatus: "rejected",
      menteeAccepted: false,
    });

    // Send notification to mentor
    await Notification.create({
      userId: mentorEntreprenuer.Mentor.id,
      to: "Mentor",
      message: `${mentorEntreprenuer.Entreprenuer.name} has declined the meeting. ${reason ? `Reason: ${reason}` : ""}`,
    });

    successResponse(res, {
      message: "Appointment rejected",
      mentorship: mentorEntreprenuer,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Complete meeting
const completeMeeting = async (req, res) => {
  try {
    const { uuid } = req.params;

    const mentorEntreprenuer = await MentorEntreprenuer.findOne({
      where: { uuid },
    });

    if (!mentorEntreprenuer) {
      return errorResponse(res, "Mentorship relationship not found", 404);
    }

    // Update appointment status
    await mentorEntreprenuer.update({
      appointmentStatus: "completed",
    });

    successResponse(res, {
      message: "Meeting marked as completed",
      mentorship: mentorEntreprenuer,
    });
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
  setupMeeting,
  acceptAppointment,
  rejectAppointment,
  completeMeeting,
};
