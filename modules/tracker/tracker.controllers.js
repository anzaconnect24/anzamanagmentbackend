const { Op } = require("sequelize");
const { errorResponse, successResponse } = require("../../utils/responses");
const {
  Business,
  Milestone,
  TrackerEnterprise,
  TrackerSession,
  WeeklyLog,
  User,
  Program,
  MentorEntreprenuer,
} = require("../../models");

const csvEscape = (value) => {
  const safeValue = value === null || value === undefined ? "" : String(value);
  return `"${safeValue.replace(/"/g, '""')}"`;
};

const ensureApprovedBusiness = async (entreprenuerId) => {
  return Business.findOne({
    where: {
      userId: entreprenuerId,
      status: "accepted",
    },
  });
};

const ensureMentorAssignment = async (mentorId, entreprenuerId) => {
  return MentorEntreprenuer.findOne({
    where: {
      mentorId,
      entreprenuerId,
    },
  });
};

const getMentorEnterpriseByUuid = async (mentorId, enterpriseUuid) => {
  return TrackerEnterprise.findOne({
    where: {
      uuid: enterpriseUuid,
      mentorId,
    },
  });
};

const normalizeTrancheStages = (value) => {
  const parsedValue =
    typeof value === "string" ? JSON.parse(value || "[]") : value;

  if (!Array.isArray(parsedValue)) {
    return [];
  }

  return parsedValue
    .map((item) => ({
      title: String(item?.title || "").trim(),
      date: item?.date ? String(item.date).slice(0, 10) : "",
      amount: Number(item?.amount || 0),
    }))
    .filter((item) => item.title && item.date);
};

const listMentorEnterprises = async (req, res) => {
  try {
    const mentorId = req.user.id;

    const enterprises = await TrackerEnterprise.findAll({
      where: { mentorId },
      order: [["updatedAt", "DESC"]],
      include: [
        {
          model: User,
          as: "Entreprenuer",
          attributes: ["id", "uuid", "name", "email"],
        },
        {
          model: TrackerSession,
          attributes: ["id"],
        },
      ],
    });

    successResponse(res, enterprises);
  } catch (error) {
    errorResponse(res, error);
  }
};

const upsertMentorEnterprise = async (req, res) => {
  try {
    const mentorId = req.user.id;
    const {
      entreprenuer_uuid,
      program_uuid,
      category,
      ceSector,
      assignedBda,
      district,
      leadContact,
      grantUsd,
      awardDate,
      businessDescription,
      flag,
    } = req.body;

    const entrepreneur = await User.findOne({
      where: { uuid: entreprenuer_uuid, role: "Enterprenuer" },
      attributes: ["id", "uuid", "name"],
    });

    if (!entrepreneur) {
      return res.status(404).json({
        status: false,
        message: "Entrepreneur not found",
      });
    }

    const selectedProgram = await Program.findOne({
      where: { uuid: program_uuid },
      attributes: ["id", "uuid", "title", "programCategory"],
    });

    if (!selectedProgram) {
      return res.status(404).json({
        status: false,
        message: "Program not found",
      });
    }

    const assignment = await ensureMentorAssignment(mentorId, entrepreneur.id);
    if (!assignment) {
      return res.status(403).json({
        status: false,
        message: "You can only add assigned entrepreneurs as enterprises",
      });
    }

    const business = await ensureApprovedBusiness(entrepreneur.id);
    if (!business) {
      return res.status(400).json({
        status: false,
        message: "Entrepreneur business is not approved for tracker",
      });
    }

    const payload = {
      mentorId,
      entreprenuerId: entrepreneur.id,
      businessId: business.id,
      name: business.name || entrepreneur.name,
      category: category || selectedProgram.programCategory,
      ceSector,
      assignedBda,
      district,
      leadContact,
      grantUsd: Number(grantUsd) || 0,
      awardDate,
      businessDescription,
    };

    if (["green", "amber", "red"].includes(flag)) {
      payload.flag = flag;
    }

    const enterprise = await TrackerEnterprise.create(payload);

    successResponse(res, enterprise);
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateMentorEnterprise = async (req, res) => {
  try {
    const mentorId = req.user.id;
    const { uuid } = req.params;
    const {
      program_uuid,
      category,
      ceSector,
      assignedBda,
      district,
      leadContact,
      grantUsd,
      awardDate,
      businessDescription,
      flag,
    } = req.body;

    const enterprise = await getMentorEnterpriseByUuid(mentorId, uuid);
    if (!enterprise) {
      return res.status(404).json({
        status: false,
        message: "Enterprise not found",
      });
    }

    let selectedProgram = null;
    if (program_uuid) {
      selectedProgram = await Program.findOne({
        where: { uuid: program_uuid },
        attributes: ["id", "uuid", "title", "programCategory"],
      });

      if (!selectedProgram) {
        return res.status(404).json({
          status: false,
          message: "Program not found",
        });
      }
    }

    const payload = {
      category:
        category || selectedProgram?.programCategory || enterprise.category,
      ceSector,
      assignedBda,
      district,
      leadContact,
      grantUsd: Number(grantUsd) || 0,
      awardDate,
      businessDescription,
    };

    if (["green", "amber", "red"].includes(flag)) {
      payload.flag = flag;
    }

    const response = await enterprise.update(payload);
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteMentorEnterprise = async (req, res) => {
  try {
    const mentorId = req.user.id;
    const { uuid } = req.params;

    const enterprise = await getMentorEnterpriseByUuid(mentorId, uuid);
    if (!enterprise) {
      return res.status(404).json({
        status: false,
        message: "Enterprise not found",
      });
    }

    await enterprise.destroy();
    successResponse(res, { deleted: true });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getMentorEnterpriseDetails = async (req, res) => {
  try {
    const mentorId = req.user.id;
    const { uuid } = req.params;

    const enterprise = await TrackerEnterprise.findOne({
      where: {
        uuid,
        mentorId,
      },
      include: [
        {
          model: User,
          as: "Entreprenuer",
          attributes: ["id", "uuid", "name", "email"],
        },
      ],
    });

    if (!enterprise) {
      return res.status(404).json({
        status: false,
        message: "Enterprise not found",
      });
    }

    const [sessions, weeklyLogs, milestones] = await Promise.all([
      TrackerSession.findAll({
        where: {
          enterpriseId: enterprise.id,
          mentorId,
        },
        order: [["sessionDate", "DESC"]],
      }),
      WeeklyLog.findAll({
        where: {
          mentorId,
          entreprenuerId: enterprise.entreprenuerId,
        },
        include: [
          {
            model: User,
            as: "Entreprenuer",
            attributes: ["id", "uuid", "name", "email"],
          },
        ],
        order: [["weekStart", "DESC"]],
      }),
      Milestone.findAll({
        where: {
          mentorId,
          entreprenuerId: enterprise.entreprenuerId,
        },
        include: [
          {
            model: User,
            as: "Entreprenuer",
            attributes: ["id", "uuid", "name", "email"],
          },
        ],
        order: [["createdAt", "DESC"]],
      }),
    ]);

    const trancheStages = normalizeTrancheStages(enterprise.trancheStages);

    const completedMilestones = milestones.filter(
      (item) => item.status === "completed",
    ).length;

    const stats = {
      sessionsCount: sessions.length,
      weeklyLogsCount: weeklyLogs.length,
      milestonesCount: milestones.length,
      milestonesProgress: milestones.length
        ? Math.round((completedMilestones / milestones.length) * 100)
        : 0,
      mentorshipHours: weeklyLogs.reduce(
        (sum, item) => sum + Number(item.hours || 0),
        0,
      ),
    };

    successResponse(res, {
      enterprise,
      sessions,
      weeklyLogs,
      milestones,
      trancheStages,
      stats,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateMentorEnterpriseTrancheStages = async (req, res) => {
  try {
    const mentorId = req.user.id;
    const { uuid } = req.params;
    const { trancheStages } = req.body;

    const enterprise = await getMentorEnterpriseByUuid(mentorId, uuid);
    if (!enterprise) {
      return res.status(404).json({
        status: false,
        message: "Enterprise not found",
      });
    }

    let normalizedStages = [];
    try {
      normalizedStages = normalizeTrancheStages(trancheStages);
    } catch (error) {
      return res.status(400).json({
        status: false,
        message: "Invalid tranche stages payload",
      });
    }

    await enterprise.update({
      trancheStages: JSON.stringify(normalizedStages),
    });

    successResponse(res, {
      trancheStages: normalizedStages,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateMentorEnterpriseKpis = async (req, res) => {
  try {
    const mentorId = req.user.id;
    const { uuid } = req.params;
    const {
      monthlyRevenue,
      employees,
      wasteDiverted,
      ceReadinessScore,
      capitalMobilised,
      activeCustomers,
    } = req.body;

    const enterprise = await getMentorEnterpriseByUuid(mentorId, uuid);
    if (!enterprise) {
      return res.status(404).json({
        status: false,
        message: "Enterprise not found",
      });
    }

    const payload = {
      monthlyRevenue: Number(monthlyRevenue) || 0,
      employees: Number(employees) || 0,
      wasteDiverted: Number(wasteDiverted) || 0,
      ceReadinessScore:
        ceReadinessScore === "" || ceReadinessScore === null
          ? null
          : Number(ceReadinessScore),
      capitalMobilised: Number(capitalMobilised) || 0,
      activeCustomers: Number(activeCustomers) || 0,
    };

    const response = await enterprise.update(payload);
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const createMentorEnterpriseSession = async (req, res) => {
  try {
    const mentorId = req.user.id;
    const { uuid } = req.params;
    const {
      sessionDate,
      facilitator,
      sessionType,
      issuesDiscussed,
      recommendationsGiven,
      actionsAgreed,
      nextSessionDate,
      flag = "green",
    } = req.body;

    const enterprise = await getMentorEnterpriseByUuid(mentorId, uuid);
    if (!enterprise) {
      return res.status(404).json({
        status: false,
        message: "Enterprise not found",
      });
    }

    const response = await TrackerSession.create({
      enterpriseId: enterprise.id,
      mentorId,
      entreprenuerId: enterprise.entreprenuerId,
      businessId: enterprise.businessId,
      createdById: req.user.id,
      sessionDate,
      facilitator,
      sessionType,
      issuesDiscussed,
      recommendationsGiven,
      actionsAgreed,
      nextSessionDate,
      flag: ["green", "amber", "red"].includes(flag) ? flag : "green",
    });

    if (["green", "amber", "red"].includes(flag)) {
      await enterprise.update({ flag });
    }

    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const createEnterpriseWeeklyLog = async (req, res) => {
  try {
    const mentorId = req.user.id;
    const { uuid } = req.params;
    const {
      weekStart,
      facilitator,
      hours,
      touchpoints,
      activities,
      focus,
      outcomes,
      barriers,
      nextPlan,
      engagement,
      flag = "green",
    } = req.body;

    const enterprise = await getMentorEnterpriseByUuid(mentorId, uuid);
    if (!enterprise) {
      return res.status(404).json({
        status: false,
        message: "Enterprise not found",
      });
    }

    const response = await WeeklyLog.create({
      mentorId,
      entreprenuerId: enterprise.entreprenuerId,
      businessId: enterprise.businessId,
      createdById: req.user.id,
      weekStart,
      facilitator,
      hours: parseFloat(hours) || 0,
      touchpoints: parseInt(touchpoints) || 0,
      activities: Array.isArray(activities) ? activities : [],
      focus,
      outcomes,
      barriers,
      nextPlan,
      engagement,
      flag: ["green", "amber", "red"].includes(flag) ? flag : "green",
    });

    if (["green", "amber", "red"].includes(flag)) {
      await enterprise.update({ flag });
    }

    successResponse(res, response);
  } catch (error) {
    if (
      error.name === "SequelizeUniqueConstraintError" ||
      (error.parent && error.parent.code === "ER_DUP_ENTRY")
    ) {
      return res.status(409).json({
        status: false,
        message:
          "A weekly log already exists for this mentor, entrepreneur, and week",
      });
    }

    errorResponse(res, error);
  }
};

const createEnterpriseMilestone = async (req, res) => {
  try {
    const mentorId = req.user.id;
    const { uuid } = req.params;
    const { title, description, dueDate, status, linkedTranche } = req.body;

    if (!title) {
      return res.status(400).json({
        status: false,
        message: "Milestone title is required",
      });
    }

    const enterprise = await getMentorEnterpriseByUuid(mentorId, uuid);
    if (!enterprise) {
      return res.status(404).json({
        status: false,
        message: "Enterprise not found",
      });
    }

    const safeStatus = [
      "pending",
      "in_progress",
      "submitted",
      "completed",
      "overdue",
      "rejected",
    ].includes(status)
      ? status
      : "pending";

    const response = await Milestone.create({
      mentorId,
      entreprenuerId: enterprise.entreprenuerId,
      businessId: enterprise.businessId,
      title,
      description,
      dueDate,
      status: safeStatus,
      linkedTranche,
    });

    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const getMentorOverview = async (req, res) => {
  try {
    const mentorId = req.user.id;

    const [weeklyCount, redFlags, milestones] = await Promise.all([
      WeeklyLog.count({ where: { mentorId } }),
      WeeklyLog.count({ where: { mentorId, flag: "red" } }),
      Milestone.count({
        where: {
          mentorId,
          status: {
            [Op.in]: ["pending", "in_progress", "submitted"],
          },
        },
      }),
    ]);

    successResponse(res, {
      weeklyLogs: weeklyCount,
      redFlags,
      openMilestones: milestones,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const listMentorWeeklyLogs = async (req, res) => {
  try {
    const mentorId = req.user.id;
    const { page = 1, limit = 10, entreprenuer_uuid } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = req.user.role === "Admin" ? {} : { mentorId };

    if (entreprenuer_uuid) {
      const entrepreneur = await User.findOne({
        where: { uuid: entreprenuer_uuid },
        attributes: ["id"],
      });
      if (!entrepreneur) {
        return successResponse(res, {
          weeklyLogs: [],
          pagination: {
            total: 0,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: 0,
          },
        });
      }
      where.entreprenuerId = entrepreneur.id;
    }

    const { count, rows } = await WeeklyLog.findAndCountAll({
      where,
      order: [["weekStart", "DESC"]],
      include: [
        {
          model: User,
          as: "Entreprenuer",
          attributes: ["id", "uuid", "name", "email"],
        },
      ],
      limit: parseInt(limit),
      offset,
    });

    successResponse(res, {
      weeklyLogs: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const createWeeklyLog = async (req, res) => {
  try {
    const mentorId = req.user.id;
    const {
      entreprenuer_uuid,
      weekStart,
      facilitator,
      hours,
      touchpoints,
      activities,
      focus,
      outcomes,
      barriers,
      nextPlan,
      engagement,
      flag,
    } = req.body;

    const entrepreneur = await User.findOne({
      where: { uuid: entreprenuer_uuid, role: "Enterprenuer" },
      attributes: ["id", "uuid", "name"],
    });

    if (!entrepreneur) {
      return res.status(404).json({
        status: false,
        message: "Entrepreneur not found",
      });
    }

    const assignment = await ensureMentorAssignment(mentorId, entrepreneur.id);
    if (!assignment) {
      return res.status(403).json({
        status: false,
        message:
          "You can only log weekly progress for approved assigned entrepreneurs",
      });
    }

    const business = await ensureApprovedBusiness(entrepreneur.id);
    if (!business) {
      return res.status(400).json({
        status: false,
        message: "Entrepreneur business is not approved for tracker",
      });
    }

    const payload = {
      mentorId,
      entreprenuerId: entrepreneur.id,
      businessId: business.id,
      createdById: req.user.id,
      weekStart,
      facilitator,
      hours: parseFloat(hours) || 0,
      touchpoints: parseInt(touchpoints) || 0,
      activities: Array.isArray(activities) ? activities : [],
      focus,
      outcomes,
      barriers,
      nextPlan,
      engagement,
      flag,
    };

    const weeklyLog = await WeeklyLog.create(payload);
    successResponse(res, weeklyLog);
  } catch (error) {
    if (
      error.name === "SequelizeUniqueConstraintError" ||
      (error.parent && error.parent.code === "ER_DUP_ENTRY")
    ) {
      return res.status(409).json({
        status: false,
        message:
          "A weekly log already exists for this mentor, entrepreneur, and week",
      });
    }

    errorResponse(res, error);
  }
};

const createMilestone = async (req, res) => {
  try {
    const mentorId = req.user.id;
    const { entreprenuer_uuid, title, description, dueDate } = req.body;

    if (!title) {
      return res.status(400).json({
        status: false,
        message: "Milestone title is required",
      });
    }

    const entrepreneur = await User.findOne({
      where: { uuid: entreprenuer_uuid, role: "Enterprenuer" },
      attributes: ["id", "uuid", "name"],
    });

    if (!entrepreneur) {
      return res.status(404).json({
        status: false,
        message: "Entrepreneur not found",
      });
    }

    const assignment = await ensureMentorAssignment(mentorId, entrepreneur.id);
    if (!assignment) {
      return res.status(403).json({
        status: false,
        message:
          "You can only create milestones for approved assigned entrepreneurs",
      });
    }

    const business = await ensureApprovedBusiness(entrepreneur.id);
    if (!business) {
      return res.status(400).json({
        status: false,
        message: "Entrepreneur business is not approved for tracker",
      });
    }

    const milestone = await Milestone.create({
      mentorId,
      entreprenuerId: entrepreneur.id,
      businessId: business.id,
      title,
      description,
      dueDate,
      status: "pending",
    });

    successResponse(res, milestone);
  } catch (error) {
    errorResponse(res, error);
  }
};

const listMilestones = async (req, res) => {
  try {
    const role = req.user.role;
    const where = {};
    const { entreprenuer_uuid } = req.query;

    if (role === "Mentor") {
      where.mentorId = req.user.id;
    } else if (role === "Enterprenuer") {
      where.entreprenuerId = req.user.id;
    }

    if (entreprenuer_uuid && ["Mentor", "Admin"].includes(role)) {
      const entrepreneur = await User.findOne({
        where: { uuid: entreprenuer_uuid },
        attributes: ["id"],
      });

      if (!entrepreneur) {
        return successResponse(res, []);
      }

      where.entreprenuerId = entrepreneur.id;
    }

    const milestones = await Milestone.findAll({
      where,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: User,
          as: "Mentor",
          attributes: ["id", "uuid", "name", "email"],
        },
        {
          model: User,
          as: "Entreprenuer",
          attributes: ["id", "uuid", "name", "email"],
        },
      ],
    });

    successResponse(res, milestones);
  } catch (error) {
    errorResponse(res, error);
  }
};

const submitMilestone = async (req, res) => {
  try {
    const { uuid } = req.params;
    const { submissionNotes } = req.body;

    const milestone = await Milestone.findOne({
      where: { uuid },
    });

    if (!milestone) {
      return res.status(404).json({
        status: false,
        message: "Milestone not found",
      });
    }

    if (milestone.entreprenuerId !== req.user.id) {
      return res.status(403).json({
        status: false,
        message: "You can only submit milestones assigned to you",
      });
    }

    const updated = await milestone.update({
      submissionNotes,
      submissionDate: new Date(),
      status: "submitted",
    });

    successResponse(res, updated);
  } catch (error) {
    errorResponse(res, error);
  }
};

const reviewMilestone = async (req, res) => {
  try {
    const { uuid } = req.params;
    const { status, mentorReviewNotes } = req.body;

    if (!["in_progress", "completed", "overdue", "rejected"].includes(status)) {
      return res.status(400).json({
        status: false,
        message:
          "Invalid milestone status. Allowed: in_progress, completed, overdue, rejected",
      });
    }

    const milestone = await Milestone.findOne({ where: { uuid } });
    if (!milestone) {
      return res.status(404).json({
        status: false,
        message: "Milestone not found",
      });
    }

    if (req.user.role === "Mentor" && milestone.mentorId !== req.user.id) {
      return res.status(403).json({
        status: false,
        message: "You can only review your own milestone assignments",
      });
    }

    const updated = await milestone.update({
      status,
      mentorReviewNotes,
      reviewedById: req.user.id,
      reviewedAt: new Date(),
    });

    successResponse(res, updated);
  } catch (error) {
    errorResponse(res, error);
  }
};

const getAdminOverview = async (req, res) => {
  try {
    const [totalWeeklyLogs, redFlags, totalMilestones, submittedMilestones] =
      await Promise.all([
        WeeklyLog.count(),
        WeeklyLog.count({ where: { flag: "red" } }),
        Milestone.count(),
        Milestone.count({ where: { status: "submitted" } }),
      ]);

    successResponse(res, {
      totalWeeklyLogs,
      redFlags,
      totalMilestones,
      submittedMilestones,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const listAdminBusinesses = async (req, res) => {
  try {
    const [weeklyBusinessIds, milestoneBusinessIds] = await Promise.all([
      WeeklyLog.findAll({
        attributes: ["businessId"],
        group: ["businessId"],
        raw: true,
      }),
      Milestone.findAll({
        attributes: ["businessId"],
        group: ["businessId"],
        raw: true,
      }),
    ]);

    const businessIdSet = new Set([
      ...weeklyBusinessIds.map((row) => row.businessId),
      ...milestoneBusinessIds.map((row) => row.businessId),
    ]);

    if (businessIdSet.size === 0) {
      return successResponse(res, []);
    }

    const businesses = await Business.findAll({
      where: {
        id: { [Op.in]: Array.from(businessIdSet) },
      },
      attributes: ["id", "uuid", "name"],
      order: [["name", "ASC"]],
    });

    successResponse(res, businesses);
  } catch (error) {
    errorResponse(res, error);
  }
};

const listAdminWeeklyLogs = async (req, res) => {
  try {
    const { flag, page = 1, limit = 20, weekStart, businessUuid } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (flag && ["green", "amber", "red"].includes(flag)) {
      where.flag = flag;
    }
    if (weekStart) {
      where.weekStart = weekStart;
    }

    const { count, rows } = await WeeklyLog.findAndCountAll({
      where,
      order: [
        ["weekStart", "DESC"],
        ["createdAt", "DESC"],
      ],
      include: [
        {
          model: User,
          as: "Mentor",
          attributes: ["id", "uuid", "name", "email"],
        },
        {
          model: User,
          as: "Entreprenuer",
          attributes: ["id", "uuid", "name", "email"],
        },
        {
          model: Business,
          attributes: ["id", "uuid", "name"],
          ...(businessUuid
            ? {
                where: { uuid: businessUuid },
                required: true,
              }
            : {}),
        },
      ],
      limit: parseInt(limit),
      offset,
    });

    successResponse(res, {
      weeklyLogs: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const listAdminMilestones = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, businessUuid } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (
      status &&
      [
        "pending",
        "in_progress",
        "submitted",
        "completed",
        "overdue",
        "rejected",
      ].includes(status)
    ) {
      where.status = status;
    }

    const { count, rows } = await Milestone.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: User,
          as: "Mentor",
          attributes: ["id", "uuid", "name", "email"],
        },
        {
          model: User,
          as: "Entreprenuer",
          attributes: ["id", "uuid", "name", "email"],
        },
        {
          model: Business,
          attributes: ["id", "uuid", "name"],
          ...(businessUuid
            ? {
                where: { uuid: businessUuid },
                required: true,
              }
            : {}),
        },
      ],
      limit: parseInt(limit),
      offset,
    });

    successResponse(res, {
      milestones: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const exportAdminTrackerCsv = async (req, res) => {
  try {
    const [weeklyLogs, milestones] = await Promise.all([
      WeeklyLog.findAll({
        order: [["weekStart", "DESC"]],
        include: [
          {
            model: User,
            as: "Mentor",
            attributes: ["name", "email"],
          },
          {
            model: User,
            as: "Entreprenuer",
            attributes: ["name", "email"],
          },
        ],
      }),
      Milestone.findAll({
        order: [["createdAt", "DESC"]],
        include: [
          {
            model: User,
            as: "Mentor",
            attributes: ["name", "email"],
          },
          {
            model: User,
            as: "Entreprenuer",
            attributes: ["name", "email"],
          },
        ],
      }),
    ]);

    const rows = [
      [
        "Type",
        "Mentor",
        "Mentor Email",
        "Entrepreneur",
        "Entrepreneur Email",
        "Week Start",
        "Hours",
        "Touchpoints",
        "Flag",
        "Milestone Title",
        "Milestone Status",
        "Due Date",
        "Submission Date",
        "Submission Notes",
        "Review Notes",
      ],
    ];

    weeklyLogs.forEach((log) => {
      rows.push([
        "Weekly Log",
        log.Mentor?.name || "",
        log.Mentor?.email || "",
        log.Entreprenuer?.name || "",
        log.Entreprenuer?.email || "",
        log.weekStart || "",
        log.hours || "",
        log.touchpoints || "",
        log.flag || "",
        "",
        "",
        "",
        "",
        "",
        "",
      ]);
    });

    milestones.forEach((milestone) => {
      rows.push([
        "Milestone",
        milestone.Mentor?.name || "",
        milestone.Mentor?.email || "",
        milestone.Entreprenuer?.name || "",
        milestone.Entreprenuer?.email || "",
        "",
        "",
        "",
        "",
        milestone.title || "",
        milestone.status || "",
        milestone.dueDate || "",
        milestone.submissionDate || "",
        milestone.submissionNotes || "",
        milestone.mentorReviewNotes || "",
      ]);
    });

    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=tracker-admin-${new Date().toISOString().slice(0, 10)}.csv`,
    );

    res.status(200).send(csv);
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  getMentorOverview,
  listMentorEnterprises,
  upsertMentorEnterprise,
  updateMentorEnterprise,
  deleteMentorEnterprise,
  getMentorEnterpriseDetails,
  updateMentorEnterpriseTrancheStages,
  updateMentorEnterpriseKpis,
  createMentorEnterpriseSession,
  createEnterpriseWeeklyLog,
  createEnterpriseMilestone,
  listMentorWeeklyLogs,
  createWeeklyLog,
  createMilestone,
  listMilestones,
  submitMilestone,
  reviewMilestone,
  getAdminOverview,
  listAdminBusinesses,
  listAdminWeeklyLogs,
  listAdminMilestones,
  exportAdminTrackerCsv,
};
