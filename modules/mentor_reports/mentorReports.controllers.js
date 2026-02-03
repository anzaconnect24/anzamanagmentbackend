const { errorResponse, successResponse } = require("../../utils/responses");
const { MentorReport, User, Business, Notification } = require("../../models");
const { sendEmail } = require("../../utils/send_email");
const getUrl = require("../../utils/cloudinary_upload");

const createMentorReport = async (req, res) => {
  try {
    const {
      mentor_uuid,
      entreprenuer_uuid,
      title,
      description,
      meetingDate,
      meetingDuration,
      topicsDiscussed,
      progressMade,
      challengesFaced,
      actionItems,
      nextMeetingDate,
      overallProgress,
      recommendations,
      sessionOverview,
      menteeEngagementRating,
      menteeEngagementComments,
      significantProgress,
      progressDetails,
      areasForImprovement,
      nextSteps,
      supportNeeded,
      supportDetails,
      overallFeedback,
      sessionRating,
    } = req.body;

    const url = req.file ? await getUrl(req) : null;

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
      meetingDate,
      meetingDuration,
      topicsDiscussed,
      progressMade,
      challengesFaced,
      actionItems,
      nextMeetingDate,
      overallProgress,
      recommendations,
      sessionOverview,
      menteeEngagementRating,
      menteeEngagementComments,
      significantProgress:
        significantProgress === "true" || significantProgress === true,
      progressDetails,
      areasForImprovement,
      nextSteps,
      supportNeeded: supportNeeded === "true" || supportNeeded === true,
      supportDetails,
      overallFeedback,
      sessionRating: sessionRating ? parseInt(sessionRating) : null,
    });

    // Send notification to entrepreneur
    await Notification.create({
      userId: entreprenuer.id,
      to: "Enterprenuer",
      message: `${mentor.name} has submitted a mentorship report. Check your dashboard to view it.`,
    });

    // Send notification to admin
    await Notification.create({
      to: "Admin",
      message: `${mentor.name} submitted a report for ${entreprenuer.name}.`,
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
      order: [["createdAt", "DESC"]],
      where: {
        mentorId: mentor.id,
      },
      include: [
        {
          model: User,
          as: "Entreprenuer",
          include: [Business],
        },
      ],
    });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};
const getAllReports = async (req, res) => {
  try {
    const response = await MentorReport.findAll({
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: User,
          as: "Entreprenuer",
          include: [Business],
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
const getEntreprenuerReports = async (req, res) => {
  try {
    const { uuid } = req.params;
    const entreprenuer = await User.findOne({
      where: {
        uuid,
      },
    });
    const response = await MentorReport.findAll({
      order: [["createdAt", "DESC"]],
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
const getMentorReport = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const response = await MentorReport.findOne({
      where: {
        uuid,
      },
      include: [
        {
          model: User,
          as: "Entreprenuer",
          include: [Business],
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
const deleteMentorReport = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const mentorReport = await MentorReport.findOne({
      where: {
        uuid,
      },
    });
    const response = await mentorReport.destroy();
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  createMentorReport,
  getMentorReports,
  getAllReports,
  getMentorReport,
  getEntreprenuerReports,
  deleteMentorReport,
};
