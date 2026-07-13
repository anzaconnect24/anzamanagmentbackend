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

const isMentorScopedRole = (role) =>
  ["Mentor", "Staff", "Reviewer"].includes(String(role || ""));

const isFinanceOrAdminRole = (role) =>
  ["Admin", "Finance"].includes(String(role || ""));

const getScopedEnterpriseByUuid = async (req, enterpriseUuid) => {
  const role = req.user?.role;

  if (isFinanceOrAdminRole(role)) {
    return TrackerEnterprise.findOne({
      where: { uuid: enterpriseUuid },
    });
  }

  return getMentorEnterpriseByUuid(req.user.id, enterpriseUuid);
};

const toPlainRecord = (value) =>
  value && typeof value.toJSON === "function" ? value.toJSON() : value;

const TRACKER_CATEGORIES_MARKER = "__TRACKER_CATEGORIES__:";

const getProgramCategories = (program) => {
  const fallbackCategory = String(program?.programCategory || "").trim();
  const rawDescription = String(program?.description || "");
  const markerIndex = rawDescription.lastIndexOf(TRACKER_CATEGORIES_MARKER);

  if (markerIndex === -1) {
    return fallbackCategory ? [fallbackCategory] : [];
  }

  const rawCategories = rawDescription
    .slice(markerIndex + TRACKER_CATEGORIES_MARKER.length)
    .trim();

  let parsedCategories = [];
  try {
    const parsedValue = JSON.parse(rawCategories);
    if (Array.isArray(parsedValue)) {
      parsedCategories = parsedValue;
    }
  } catch (error) {
    parsedCategories = [];
  }

  return Array.from(
    new Set(
      [...parsedCategories, fallbackCategory]
        .map((item) => String(item || "").trim())
        .filter(Boolean),
    ),
  );
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

const normalizeMilestoneAttachments = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => String(item || "").trim())
        .filter((item) => item.length > 0),
    ),
  );
};

const listMentorEnterprises = async (req, res) => {
  try {
    const role = req.user.role;
    const where = isMentorScopedRole(role) ? { mentorId: req.user.id } : {};

    const enterprises = await TrackerEnterprise.findAll({
      where,
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
        {
          model: Program,
          attributes: ["id", "uuid", "title", "programCategory"],
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
    const requesterRole = req.user.role;
    const {
      entreprenuer_uuid,
      mentor_uuid,
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
      signedContractUrl,
      signedContractUploadedAt,
      startupSignedContractUrl,
      contractAcknowledgedAt,
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

    let mentorId = req.user.id;

    if (isFinanceOrAdminRole(requesterRole)) {
      if (mentor_uuid) {
        const mentor = await User.findOne({
          where: { uuid: mentor_uuid },
          attributes: ["id"],
        });

        if (mentor) {
          mentorId = mentor.id;
        }
      }

      if (!mentorId || mentorId === req.user.id) {
        const assignment = await MentorEntreprenuer.findOne({
          where: {
            entreprenuerId: entrepreneur.id,
          },
          attributes: ["mentorId"],
          order: [["updatedAt", "DESC"]],
        });
        mentorId = assignment?.mentorId || mentorId;
      }
    }

    if (!isFinanceOrAdminRole(requesterRole)) {
      const assignment = await ensureMentorAssignment(
        mentorId,
        entrepreneur.id,
      );
      if (!assignment) {
        return res.status(403).json({
          status: false,
          message: "You can only add assigned entrepreneurs as enterprises",
        });
      }
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
      programId: selectedProgram.id,
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

    if (signedContractUrl) {
      payload.signedContractUrl = signedContractUrl;
    }
    if (signedContractUploadedAt) {
      payload.signedContractUploadedAt = signedContractUploadedAt;
    }
    if (startupSignedContractUrl) {
      payload.startupSignedContractUrl = startupSignedContractUrl;
    }
    if (contractAcknowledgedAt) {
      payload.contractAcknowledgedAt = contractAcknowledgedAt;
    }

    const enterprise = await TrackerEnterprise.create(payload);

    successResponse(res, enterprise);
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateMentorEnterprise = async (req, res) => {
  try {
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
      signedContractUrl,
      signedContractUploadedAt,
      startupSignedContractUrl,
      contractAcknowledgedAt,
    } = req.body;

    const enterprise = await getScopedEnterpriseByUuid(req, uuid);
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
      programId: selectedProgram?.id || enterprise.programId,
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

    if (typeof signedContractUrl === "string") {
      payload.signedContractUrl = signedContractUrl;
    }
    if (signedContractUploadedAt) {
      payload.signedContractUploadedAt = signedContractUploadedAt;
    }
    if (typeof startupSignedContractUrl === "string") {
      payload.startupSignedContractUrl = startupSignedContractUrl;
    }
    if (contractAcknowledgedAt) {
      payload.contractAcknowledgedAt = contractAcknowledgedAt;
    }

    const response = await enterprise.update(payload);
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteMentorEnterprise = async (req, res) => {
  try {
    const { uuid } = req.params;

    const enterprise = await getScopedEnterpriseByUuid(req, uuid);
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
    const role = req.user.role;
    const { uuid } = req.params;

    const where = { uuid };
    if (isMentorScopedRole(role)) {
      where.mentorId = req.user.id;
    }

    const enterprise = await TrackerEnterprise.findOne({
      where,
      include: [
        {
          model: User,
          as: "Entreprenuer",
          attributes: ["id", "uuid", "name", "email"],
        },
        {
          model: Program,
          attributes: ["id", "uuid", "title", "programCategory"],
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
          mentorId: enterprise.mentorId,
        },
        order: [["sessionDate", "DESC"]],
      }),
      WeeklyLog.findAll({
        where: {
          mentorId: enterprise.mentorId,
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
          mentorId: enterprise.mentorId,
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

const getEntrepreneurTrackerDashboard = async (req, res) => {
  try {
    const entreprenuerId = req.user.id;

    const { enterpriseUuid } = req.query;

    const enterprises = await TrackerEnterprise.findAll({
      where: {
        entreprenuerId,
      },
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
          model: Program,
          attributes: [
            "id",
            "uuid",
            "title",
            "description",
            "programCategory",
            "startDate",
            "endDate",
          ],
        },
      ],
      order: [["updatedAt", "DESC"]],
    });

    if (!Array.isArray(enterprises) || enterprises.length === 0) {
      return res.status(404).json({
        status: false,
        message: "Tracker profile not found for this entrepreneur",
      });
    }

    let enterprise = enterprises[0];
    if (enterpriseUuid) {
      const matchedEnterprise = enterprises.find(
        (item) => item.uuid === enterpriseUuid,
      );

      if (!matchedEnterprise) {
        return res.status(404).json({
          status: false,
          message: "Selected enterprise was not found for this entrepreneur",
        });
      }

      enterprise = matchedEnterprise;
    }

    const [sessions, weeklyLogs, milestones] = await Promise.all([
      TrackerSession.findAll({
        where: {
          enterpriseId: enterprise.id,
        },
        order: [["sessionDate", "DESC"]],
      }),
      WeeklyLog.findAll({
        where: {
          entreprenuerId,
          mentorId: enterprise.mentorId,
          businessId: enterprise.businessId,
        },
        order: [["weekStart", "DESC"]],
      }),
      Milestone.findAll({
        where: {
          entreprenuerId,
          mentorId: enterprise.mentorId,
          businessId: enterprise.businessId,
        },
        include: [
          {
            model: User,
            as: "Mentor",
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

    const availableEnterprises = enterprises.map((item) => ({
      uuid: item.uuid,
      name: item.name,
      mentorName: item.Mentor?.name || "N/A",
      programUuid: item.Program?.uuid || null,
      programTitle: item.Program?.title || item.category || "N/A",
      category: item.category || null,
    }));

    successResponse(res, {
      enterprise,
      program: enterprise.Program || null,
      selectedEnterpriseUuid: enterprise.uuid,
      availableEnterprises,
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

const getTrackerProgramOverview = async (req, res) => {
  try {
    const { programUuid } = req.params;
    const role = req.user.role;
    const mentorId = req.user.id;

    const program = await Program.findOne({
      where: { uuid: programUuid },
      attributes: [
        "id",
        "uuid",
        "title",
        "description",
        "programCategory",
        "startDate",
        "endDate",
        "image",
      ],
    });

    if (!program) {
      return res.status(404).json({
        status: false,
        message: "Program not found",
      });
    }

    const programCategories = getProgramCategories(program);
    const enterpriseWhere = {
      [Op.or]: [
        { programId: program.id },
        {
          programId: null,
          ...(programCategories.length > 0
            ? {
                category: {
                  [Op.in]: programCategories,
                },
              }
            : {}),
        },
      ],
    };
    if (isMentorScopedRole(role)) {
      enterpriseWhere.mentorId = mentorId;
    }

    const enterprises = await TrackerEnterprise.findAll({
      where: enterpriseWhere,
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
        },
      ],
      order: [["updatedAt", "DESC"]],
    });

    if (enterprises.length === 0) {
      return successResponse(res, {
        program,
        enterprises: [],
        summary: {
          enterprisesCount: 0,
          sessionsCount: 0,
          weeklyLogsCount: 0,
          milestonesCount: 0,
          mentorshipHours: 0,
        },
      });
    }

    const enterpriseIds = enterprises.map((item) => item.id);

    const [sessions, weeklyLogs, milestones] = await Promise.all([
      TrackerSession.findAll({
        where: {
          enterpriseId: {
            [Op.in]: enterpriseIds,
          },
        },
        order: [["sessionDate", "DESC"]],
      }),
      WeeklyLog.findAll({
        where: {
          mentorId: {
            [Op.in]: enterprises.map((item) => item.mentorId),
          },
          entreprenuerId: {
            [Op.in]: enterprises.map((item) => item.entreprenuerId),
          },
        },
        order: [["weekStart", "DESC"]],
      }),
      Milestone.findAll({
        where: {
          mentorId: {
            [Op.in]: enterprises.map((item) => item.mentorId),
          },
          entreprenuerId: {
            [Op.in]: enterprises.map((item) => item.entreprenuerId),
          },
        },
        order: [["createdAt", "DESC"]],
      }),
    ]);

    const enterpriseItems = enterprises.map((enterprise) => {
      const enterpriseSessions = sessions.filter(
        (item) => item.enterpriseId === enterprise.id,
      );
      const enterpriseWeeklyLogs = weeklyLogs.filter(
        (item) =>
          item.mentorId === enterprise.mentorId &&
          item.entreprenuerId === enterprise.entreprenuerId,
      );
      const enterpriseMilestones = milestones.filter(
        (item) =>
          item.mentorId === enterprise.mentorId &&
          item.entreprenuerId === enterprise.entreprenuerId,
      );
      const completedMilestones = enterpriseMilestones.filter(
        (item) => item.status === "completed",
      ).length;

      return {
        enterprise: toPlainRecord(enterprise),
        sessions: enterpriseSessions.map(toPlainRecord),
        weeklyLogs: enterpriseWeeklyLogs.map(toPlainRecord),
        milestones: enterpriseMilestones.map(toPlainRecord),
        stats: {
          sessionsCount: enterpriseSessions.length,
          weeklyLogsCount: enterpriseWeeklyLogs.length,
          milestonesCount: enterpriseMilestones.length,
          milestonesProgress: enterpriseMilestones.length
            ? Math.round(
                (completedMilestones / enterpriseMilestones.length) * 100,
              )
            : 0,
          mentorshipHours: enterpriseWeeklyLogs.reduce(
            (sum, item) => sum + Number(item.hours || 0),
            0,
          ),
        },
      };
    });

    const summary = enterpriseItems.reduce(
      (accumulator, item) => {
        return {
          enterprisesCount: accumulator.enterprisesCount + 1,
          sessionsCount: accumulator.sessionsCount + item.sessions.length,
          weeklyLogsCount: accumulator.weeklyLogsCount + item.weeklyLogs.length,
          milestonesCount: accumulator.milestonesCount + item.milestones.length,
          mentorshipHours:
            accumulator.mentorshipHours + Number(item.stats.mentorshipHours),
        };
      },
      {
        enterprisesCount: 0,
        sessionsCount: 0,
        weeklyLogsCount: 0,
        milestonesCount: 0,
        mentorshipHours: 0,
      },
    );

    successResponse(res, {
      program,
      enterprises: enterpriseItems,
      summary,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateMentorEnterpriseTrancheStages = async (req, res) => {
  try {
    const { uuid } = req.params;
    const { trancheStages } = req.body;

    const enterprise = await getScopedEnterpriseByUuid(req, uuid);
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
    const { uuid } = req.params;
    const {
      monthlyRevenue,
      employees,
      wasteDiverted,
      ceReadinessScore,
      capitalMobilised,
      activeCustomers,
    } = req.body;

    const enterprise = await getScopedEnterpriseByUuid(req, uuid);
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

    const enterprise = await getScopedEnterpriseByUuid(req, uuid);
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

    const enterprise = await getScopedEnterpriseByUuid(req, uuid);
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
    const {
      title,
      description,
      dueDate,
      status,
      linkedTranche,
      trancheAmount,
      tranchePlannedUse,
      kpiPlan,
      planStatus,
      verificationStatus,
      disbursed,
    } = req.body;

    if (!title) {
      return res.status(400).json({
        status: false,
        message: "Milestone title is required",
      });
    }

    const enterprise = await getScopedEnterpriseByUuid(req, uuid);
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
      trancheAmount:
        trancheAmount === "" || trancheAmount === null
          ? null
          : Number(trancheAmount),
      tranchePlannedUse: tranchePlannedUse || null,
      kpiPlan: Array.isArray(kpiPlan)
        ? JSON.stringify(kpiPlan)
        : kpiPlan || null,
      planStatus: planStatus || null,
      verificationStatus: verificationStatus || null,
      disbursed: Boolean(disbursed),
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
    const requester = req.user;
    const {
      entreprenuer_uuid,
      title,
      description,
      dueDate,
      linkedTranche,
      trancheAmount,
      tranchePlannedUse,
      kpiPlan,
      planStatus,
      verificationStatus,
      disbursed,
    } = req.body;

    if (!title) {
      return res.status(400).json({
        status: false,
        message: "Milestone title is required",
      });
    }

    let mentorId = null;
    let entrepreneurId = null;

    if (requester.role === "Mentor") {
      mentorId = requester.id;

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

      const assignment = await ensureMentorAssignment(
        mentorId,
        entrepreneur.id,
      );
      if (!assignment) {
        return res.status(403).json({
          status: false,
          message:
            "You can only create milestones for approved assigned entrepreneurs",
        });
      }

      entrepreneurId = entrepreneur.id;
    } else if (requester.role === "Enterprenuer") {
      entrepreneurId = requester.id;

      const trackerEnterprise = await TrackerEnterprise.findOne({
        where: {
          entreprenuerId: entrepreneurId,
        },
        attributes: ["mentorId"],
        order: [["updatedAt", "DESC"]],
      });

      if (trackerEnterprise?.mentorId) {
        mentorId = trackerEnterprise.mentorId;
      } else {
        const assignment = await MentorEntreprenuer.findOne({
          where: {
            entreprenuerId: entrepreneurId,
            approved: true,
          },
          attributes: ["mentorId"],
          order: [["updatedAt", "DESC"]],
        });

        mentorId = assignment?.mentorId || null;
      }

      if (!mentorId) {
        return res.status(403).json({
          status: false,
          message: "No active mentor assignment found. Please contact support.",
        });
      }
    } else {
      return res.status(403).json({
        status: false,
        message: "Only mentors and entrepreneurs can create milestones",
      });
    }

    const business = await ensureApprovedBusiness(entrepreneurId);
    if (!business) {
      return res.status(400).json({
        status: false,
        message: "Entrepreneur business is not approved for tracker",
      });
    }

    const milestone = await Milestone.create({
      mentorId,
      entreprenuerId: entrepreneurId,
      businessId: business.id,
      title,
      description,
      dueDate,
      linkedTranche,
      status: "pending",
      trancheAmount:
        trancheAmount === "" || trancheAmount === null
          ? null
          : Number(trancheAmount),
      tranchePlannedUse: tranchePlannedUse || null,
      kpiPlan: Array.isArray(kpiPlan)
        ? JSON.stringify(kpiPlan)
        : kpiPlan || null,
      planStatus: planStatus || null,
      verificationStatus: verificationStatus || null,
      disbursed: Boolean(disbursed),
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
    const {
      submissionNotes,
      submissionAttachments,
      kpiPlan,
      requestVerification,
    } = req.body;

    const milestone = await Milestone.findOne({
      where: { uuid },
    });

    if (!milestone) {
      return res.status(404).json({
        status: false,
        message: "Milestone not found",
      });
    }

    if (milestone.status === "completed") {
      return res.status(400).json({
        status: false,
        message: "Completed milestones do not need report submission",
      });
    }

    if (milestone.entreprenuerId !== req.user.id) {
      return res.status(403).json({
        status: false,
        message: "You can only submit milestones assigned to you",
      });
    }

    const safeAttachments = normalizeMilestoneAttachments(
      submissionAttachments,
    );

    const hasNotes = String(submissionNotes || "").trim().length > 0;
    const hasAttachments = safeAttachments.length > 0;
    const hasKpiProgress =
      Array.isArray(kpiPlan) ||
      (typeof kpiPlan === "string" && String(kpiPlan).trim().length > 0);

    if (!hasNotes && !hasAttachments && !hasKpiProgress) {
      return res.status(400).json({
        status: false,
        message:
          "Please provide a report, attachments, or KPI progress before submitting this milestone",
      });
    }

    const payload = {
      submissionDate: new Date(),
      status: "submitted",
    };

    if (hasNotes) {
      payload.submissionNotes = String(submissionNotes).trim();
    }

    if (safeAttachments.length > 0) {
      payload.submissionAttachments = JSON.stringify(safeAttachments);
    }

    if (hasKpiProgress) {
      payload.kpiPlan = Array.isArray(kpiPlan)
        ? JSON.stringify(kpiPlan)
        : String(kpiPlan || "");
    }

    if (requestVerification === true || requestVerification === false) {
      payload.verificationRequested = Boolean(requestVerification);
    }

    const updated = await milestone.update(payload);

    successResponse(res, updated);
  } catch (error) {
    errorResponse(res, error);
  }
};

const reviewMilestone = async (req, res) => {
  try {
    const { uuid } = req.params;
    const {
      status,
      mentorReviewNotes,
      planStatus,
      verificationStatus,
      disbursed,
    } = req.body;

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

    const payload = {
      mentorReviewNotes,
      reviewedById: req.user.id,
      reviewedAt: new Date(),
    };

    if (status !== undefined) {
      if (
        !["in_progress", "completed", "overdue", "rejected"].includes(status)
      ) {
        return res.status(400).json({
          status: false,
          message:
            "Invalid milestone status. Allowed: in_progress, completed, overdue, rejected",
        });
      }
      payload.status = status;
    }

    if (planStatus !== undefined) {
      const allowedPlanStatuses = [
        "draft",
        "submitted",
        "under_review",
        "revision_requested",
        "resubmitted",
        "plan_approved",
        "rejected",
        "sent_to_finance",
        "disbursed",
      ];

      if (!allowedPlanStatuses.includes(String(planStatus))) {
        return res.status(400).json({
          status: false,
          message: "Invalid plan status",
        });
      }

      payload.planStatus = String(planStatus);
    }

    if (verificationStatus !== undefined) {
      const allowedVerificationStatuses = [
        "",
        "achieved",
        "partially_achieved",
        "not_achieved",
        "need_more_evidence",
      ];

      if (!allowedVerificationStatuses.includes(String(verificationStatus))) {
        return res.status(400).json({
          status: false,
          message: "Invalid verification status",
        });
      }

      payload.verificationStatus = String(verificationStatus);
      payload.verificationRequested = false;
    }

    if (disbursed !== undefined) {
      payload.disbursed = Boolean(disbursed);
      if (payload.disbursed) {
        payload.planStatus = "disbursed";
      }
    }

    const updated = await milestone.update(payload);

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

const updateEntrepreneurEnterprise = async (req, res) => {
  try {
    const entreprenuerId = req.user.id;
    const { enterpriseUuid } = req.body;

    const where = { entreprenuerId };
    if (enterpriseUuid) {
      where.uuid = enterpriseUuid;
    }

    const enterprise = await TrackerEnterprise.findOne({
      where,
      order: [["updatedAt", "DESC"]],
    });

    if (!enterprise) {
      return res.status(404).json({
        status: false,
        message: "Tracker enterprise not found for this entrepreneur",
      });
    }

    const payload = {};
    const allowedStringFields = [
      "category",
      "ceSector",
      "district",
      "leadContact",
      "businessDescription",
      "signedContractUrl",
      "startupSignedContractUrl",
    ];

    allowedStringFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        payload[field] = req.body[field];
      }
    });

    if (Object.prototype.hasOwnProperty.call(req.body, "grantUsd")) {
      payload.grantUsd = Number(req.body.grantUsd || 0);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "awardDate")) {
      payload.awardDate = req.body.awardDate || null;
    }
    if (
      Object.prototype.hasOwnProperty.call(req.body, "signedContractUploadedAt")
    ) {
      payload.signedContractUploadedAt =
        req.body.signedContractUploadedAt || null;
    }
    if (
      Object.prototype.hasOwnProperty.call(req.body, "contractAcknowledgedAt")
    ) {
      payload.contractAcknowledgedAt = req.body.contractAcknowledgedAt || null;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "monthlyRevenue")) {
      payload.monthlyRevenue = Number(req.body.monthlyRevenue || 0);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "employees")) {
      payload.employees = Number(req.body.employees || 0);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "wasteDiverted")) {
      payload.wasteDiverted = Number(req.body.wasteDiverted || 0);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "ceReadinessScore")) {
      payload.ceReadinessScore =
        req.body.ceReadinessScore === "" || req.body.ceReadinessScore === null
          ? null
          : Number(req.body.ceReadinessScore);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "capitalMobilised")) {
      payload.capitalMobilised = Number(req.body.capitalMobilised || 0);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "activeCustomers")) {
      payload.activeCustomers = Number(req.body.activeCustomers || 0);
    }

    if (["green", "amber", "red"].includes(req.body.flag)) {
      payload.flag = req.body.flag;
    }

    const updated = await enterprise.update(payload);
    successResponse(res, updated);
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
  getEntrepreneurTrackerDashboard,
  getTrackerProgramOverview,
  updateEntrepreneurEnterprise,
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
