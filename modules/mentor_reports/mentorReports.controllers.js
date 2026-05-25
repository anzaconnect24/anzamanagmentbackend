const { errorResponse, successResponse } = require("../../utils/responses");
const {
  MentorReport,
  User,
  Business,
  Notification,
  MentorEntreprenuer,
} = require("../../models");
const { sendEmail } = require("../../utils/send_email");
const getUrl = require("../../utils/cloudinary_upload");

const createMentorReport = async (req, res) => {
  try {
    const authUser = req.user;
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

    let mentor = await User.findByPk(authUser.id);
    if (authUser.role === "Admin" && mentor_uuid) {
      mentor = await User.findOne({
        where: {
          uuid: mentor_uuid,
        },
      });
    }

    if (!mentor || mentor.role !== "Mentor") {
      return res.status(403).json({
        status: false,
        message: "Only mentors can submit mentorship reports",
      });
    }

    if (
      authUser.role !== "Admin" &&
      mentor_uuid &&
      mentor.uuid !== mentor_uuid
    ) {
      return res.status(403).json({
        status: false,
        message: "You cannot submit reports on behalf of another mentor",
      });
    }

    const entreprenuer = await User.findOne({
      where: {
        uuid: entreprenuer_uuid,
      },
    });

    if (!entreprenuer || entreprenuer.role !== "Enterprenuer") {
      return res.status(404).json({
        status: false,
        message: "Entrepreneur not found",
      });
    }

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

    // Send email to startup (5. Post session follow up)
    await sendEmail(req, res, entreprenuer, "session_followup", {
      sessionDate: meetingDate
        ? new Date(meetingDate).toLocaleDateString()
        : "recent session",
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
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const mentor = await User.findOne({
      where: {
        uuid,
      },
    });

    const { count, rows } = await MentorReport.findAndCountAll({
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
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    successResponse(res, {
      reports: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    errorResponse(res, error);
  }
};
const getAllReports = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows } = await MentorReport.findAndCountAll({
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
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    successResponse(res, {
      reports: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    errorResponse(res, error);
  }
};
const getEntreprenuerReports = async (req, res) => {
  try {
    const { uuid } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const entreprenuer = await User.findOne({
      where: {
        uuid,
      },
    });

    const { count, rows } = await MentorReport.findAndCountAll({
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
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    successResponse(res, {
      reports: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
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
const getMentorEntrepreneurReports = async (req, res) => {
  try {
    const authUser = req.user;
    const { mentorUuid, entrepreneurUuid } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const mentor = await User.findOne({
      where: {
        uuid: mentorUuid,
      },
    });

    const entrepreneur = await User.findOne({
      where: {
        uuid: entrepreneurUuid,
      },
    });

    if (!mentor || !entrepreneur) {
      return errorResponse(res, new Error("Mentor or Entrepreneur not found"));
    }

    if (authUser.role === "Mentor" && mentor.id !== authUser.id) {
      return res.status(403).json({
        status: false,
        message: "You cannot view reports for another mentor",
      });
    }

    if (authUser.role === "Mentor") {
      const assignment = await MentorEntreprenuer.findOne({
        where: {
          mentorId: mentor.id,
          entreprenuerId: entrepreneur.id,
          approved: true,
        },
      });

      if (!assignment) {
        return res.status(403).json({
          status: false,
          message:
            "You can only view reports for entrepreneurs assigned to you",
        });
      }
    }

    const { count, rows } = await MentorReport.findAndCountAll({
      order: [["createdAt", "DESC"]],
      where: {
        mentorId: mentor.id,
        entreprenuerId: entrepreneur.id,
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
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    successResponse(res, {
      reports: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
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
  getMentorEntrepreneurReports,
  deleteMentorReport,
};
