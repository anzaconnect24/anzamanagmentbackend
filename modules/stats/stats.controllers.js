const { successResponse, errorResponse } = require("../../utils/responses");
const { MentorReport, User, MentorEntreprenuer } = require("../../models");
const getMentorOverviewStats = async (req, res) => {
  try {
    const mentor = req.user;
    const [mentorEnterprenuers, mentorReports] = await Promise.all([
      MentorEntreprenuer.count({
        distinct: true,
        where: {
          mentorId: mentor.id,
        },
      }),
      MentorReport.count({
        where: {
          mentorId: mentor.id,
        },
      }),
    ]);
    successResponse(res, {
      mentorEnterprenuers,
      mentorReports,
    });
  } catch (error) {
    errorResponse(res, error.message || "failed to get mentor details");
  }
};

module.exports = { getMentorOverviewStats };
