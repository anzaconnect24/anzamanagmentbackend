const {
  TrackerSession,
  User,
  Business,
  TrackerEnterprise,
} = require("../../models");

// Create a new coaching session
// Required: { entreprenuer_uuid, sessionDate, facilitator?, sessionType, issuesDiscussed?, recommendationsGiven?, actionsAgreed?, nextSessionDate?, flag? }
exports.createCoachingSession = async (req, res) => {
  try {
    const {
      entreprenuer_uuid,
      title,
      sessionDate,
      facilitator,
      sessionType,
      issuesDiscussed,
      recommendationsGiven,
      actionsAgreed,
      nextSessionDate,
      flag,
    } = req.body;
    const mentorId = req.user.id;

    if (!entreprenuer_uuid || !sessionDate || !sessionType) {
      return res.status(400).json({
        statusCode: 400,
        message:
          "Missing required fields: entreprenuer_uuid, sessionDate, sessionType",
      });
    }

    // Find entrepreneur user
    const entrepreneur = await User.findOne({
      where: { uuid: entreprenuer_uuid },
    });
    if (!entrepreneur) {
      return res.status(404).json({
        statusCode: 404,
        message: "Entrepreneur not found",
      });
    }

    // Find a tracked business for this entrepreneur (get first enterprise)
    const enterprise = await TrackerEnterprise.findOne({
      where: { entreprenuerId: entrepreneur.id },
      order: [["createdAt", "DESC"]],
    });
    if (!enterprise) {
      return res.status(400).json({
        statusCode: 400,
        message: "Entrepreneur has no tracked business",
      });
    }

    // Create coaching session
    const session = await TrackerSession.create({
      enterpriseId: enterprise.id,
      mentorId,
      entreprenuerId: entrepreneur.id,
      businessId: enterprise.businessId,
      createdById: mentorId,
      title: title || null,
      sessionDate,
      facilitator: facilitator || null,
      sessionType,
      issuesDiscussed: issuesDiscussed || null,
      recommendationsGiven: recommendationsGiven || null,
      actionsAgreed: actionsAgreed || null,
      nextSessionDate: nextSessionDate || null,
      flag: flag || "green",
    });

    res.status(201).json({
      statusCode: 201,
      message: "Coaching session created successfully",
      body: session,
    });
  } catch (error) {
    console.error("Error creating coaching session:", error);
    res.status(500).json({
      statusCode: 500,
      message: "Failed to create coaching session",
      error: error.message,
    });
  }
};

// Get coaching sessions for a specific entrepreneur
exports.getEntrepreneurCoachingSessions = async (req, res) => {
  try {
    const { uuid } = req.params;

    // Find entrepreneur user
    const entrepreneur = await User.findOne({ where: { uuid } });
    if (!entrepreneur) {
      return res.status(404).json({
        statusCode: 404,
        message: "Entrepreneur not found",
      });
    }

    // Get all coaching sessions for this entrepreneur
    const sessions = await TrackerSession.findAll({
      where: { entreprenuerId: entrepreneur.id },
      include: [
        {
          model: User,
          as: "Mentor",
          attributes: ["uuid", "name", "email"],
        },
        {
          model: User,
          as: "Creator",
          attributes: ["uuid", "name"],
        },
        {
          model: Business,
          attributes: ["uuid", "name"],
        },
      ],
      order: [["sessionDate", "DESC"]],
    });

    res.status(200).json({
      statusCode: 200,
      message: "Coaching sessions retrieved successfully",
      body: sessions || [],
    });
  } catch (error) {
    console.error("Error getting coaching sessions:", error);
    res.status(500).json({
      statusCode: 500,
      message: "Failed to retrieve coaching sessions",
      error: error.message,
    });
  }
};

// Delete a coaching session
exports.deleteCoachingSession = async (req, res) => {
  try {
    const { uuid } = req.params;
    const userId = req.user.id;

    // Find the session
    const session = await TrackerSession.findOne({ where: { uuid } });
    if (!session) {
      return res.status(404).json({
        statusCode: 404,
        message: "Coaching session not found",
      });
    }

    // Check authorization - only mentor who created it or Admin can delete
    if (session.createdById !== userId && req.user.role !== "Admin") {
      return res.status(403).json({
        statusCode: 403,
        message: "Not authorized to delete this coaching session",
      });
    }

    await session.destroy();

    res.status(200).json({
      statusCode: 200,
      message: "Coaching session deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting coaching session:", error);
    res.status(500).json({
      statusCode: 500,
      message: "Failed to delete coaching session",
      error: error.message,
    });
  }
};
