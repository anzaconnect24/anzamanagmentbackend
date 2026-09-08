// Automatic indicator sources.
//
// The platform already knows how many enterprises are enrolled, how many
// modules they finished, what capital they raised and how they scored on the
// diagnostic. An indicator wired to one of these sources is computed from
// those records every time it is read, so nobody is asked to key in a number
// the system can already answer, and the figure can never drift out of date.
//
// "manual" is the fallback for anything the platform genuinely does not hold.

const { Op, fn, col } = require("sequelize");
const {
  CohortMembership,
  Business,
  Module,
  Slide,
  SlideReader,
  Milestone,
  TrackerSession,
  CratAssessment,
  CratScoreSnapshot,
  Survey,
  SurveyResponse,
  QuizAttempt,
  Quiz,
} = require("../../models");
const { growthPercent, round } = require("./me.calculations");

// The enterprises on a programme, and the user ids behind them. Almost every
// source starts from this, so it is computed once per request and passed down.
const programmeRoster = async (cohortProgramId) => {
  const memberships = await CohortMembership.findAll({
    attributes: ["businessId", "status"],
    where: { cohortProgramId },
    raw: true,
  });

  const businessIds = memberships.map((row) => row.businessId);

  const businesses = businessIds.length
    ? await Business.findAll({
        where: { id: { [Op.in]: businessIds } },
        raw: true,
      })
    : [];

  return {
    memberships,
    businesses,
    businessIds,
    userIds: businesses.map((row) => row.userId).filter(Boolean),
    activeIds: memberships
      .filter((row) => row.status !== "dropped_out")
      .map((row) => row.businessId),
  };
};

// Sum a column across the roster, ignoring rows that never had a figure. A
// missing value is not a zero: if no enterprise has reported jobs at all, the
// answer is null, not 0.
const sumOver = (businesses, field) => {
  const values = businesses
    .map((row) => Number(row[field]))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) return null;
  return round(
    values.reduce((total, value) => total + value, 0),
    2,
  );
};

const averageOver = (values) => {
  const clean = values.filter((value) => Number.isFinite(value));
  if (clean.length === 0) return null;
  return round(
    clean.reduce((total, value) => total + value, 0) / clean.length,
    1,
  );
};

// Each source states what it measures and how, so the indicator form can
// explain itself and the UI can show where a number came from.
const SOURCES = {
  manual: {
    label: "Manually entered M&E data",
    unit: null,
    automatic: false,
    describes: "Keyed in by the M&E team and verified in the usual way.",
  },

  enterprises_enrolled: {
    label: "Enterprises enrolled",
    unit: "enterprises",
    automatic: true,
    describes: "Counted from the programme roster.",
    resolve: async (_programId, roster) => roster.businessIds.length,
  },

  enterprises_active: {
    label: "Enterprises still active",
    unit: "enterprises",
    automatic: true,
    describes: "Roster members whose status is not Dropout.",
    resolve: async (_programId, roster) => roster.activeIds.length,
  },

  enterprises_completed_modules: {
    label: "Enterprises completing the curriculum",
    unit: "enterprises",
    automatic: true,
    describes:
      "Enterprises that have read every slide of every module on the programme.",
    resolve: async (programId, roster) => {
      const modules = await Module.findAll({
        attributes: ["id"],
        where: { cohortProgramId: programId },
        raw: true,
      });

      const moduleIds = modules.map((row) => row.id);
      if (moduleIds.length === 0 || roster.userIds.length === 0) return 0;

      const slides = await Slide.findAll({
        attributes: ["id"],
        where: { moduleId: { [Op.in]: moduleIds } },
        raw: true,
      });

      const slideIds = slides.map((row) => row.id);
      if (slideIds.length === 0) return 0;

      const reads = await SlideReader.findAll({
        attributes: ["userId", "slideId"],
        where: {
          slideId: { [Op.in]: slideIds },
          userId: { [Op.in]: roster.userIds },
        },
        raw: true,
      });

      const seen = new Set();
      const byUser = new Map();

      for (const read of reads) {
        const key = read.userId + ":" + read.slideId;
        if (seen.has(key)) continue;
        seen.add(key);
        byUser.set(read.userId, (byUser.get(read.userId) || 0) + 1);
      }

      return roster.userIds.filter(
        (userId) => (byUser.get(userId) || 0) >= slideIds.length,
      ).length;
    },
  },

  jobs_created: {
    label: "Jobs created",
    unit: "jobs",
    automatic: true,
    describes: "Summed from the jobs figure on each enterprise record.",
    resolve: async (_programId, roster) =>
      sumOver(roster.businesses, "jobsCreated"),
  },

  capital_raised: {
    label: "Capital facilitated",
    unit: "USD",
    automatic: true,
    describes: "Summed from the capital raised on each enterprise record.",
    resolve: async (_programId, roster) =>
      sumOver(roster.businesses, "capitalRaised"),
  },

  enterprises_accessing_capital: {
    label: "Enterprises accessing capital",
    unit: "enterprises",
    automatic: true,
    describes: "Enterprises with capital raised above zero.",
    resolve: async (_programId, roster) =>
      roster.businesses.filter((row) => Number(row.capitalRaised) > 0).length,
  },

  total_revenue: {
    label: "Total enterprise revenue",
    unit: "currency",
    automatic: true,
    describes: "Summed from the current revenue on each enterprise record.",
    resolve: async (_programId, roster) => sumOver(roster.businesses, "revenue"),
  },

  average_revenue_growth: {
    label: "Average revenue growth",
    unit: "%",
    automatic: true,
    describes:
      "Averaged across enterprises with both a current and a prior quarter figure.",
    resolve: async (_programId, roster) =>
      averageOver(
        roster.businesses
          .map((row) => growthPercent(row.revenue, row.previousQuarterRevenue))
          .filter((value) => value !== null),
      ),
  },

  enterprises_growing_revenue: {
    label: "Enterprises increasing revenue",
    unit: "enterprises",
    automatic: true,
    describes: "Enterprises whose revenue is above their prior quarter.",
    resolve: async (_programId, roster) =>
      roster.businesses.filter((row) => {
        const growth = growthPercent(row.revenue, row.previousQuarterRevenue);
        return growth !== null && growth > 0;
      }).length,
  },

  total_customers: {
    label: "Customers reached",
    unit: "customers",
    automatic: true,
    describes: "Summed from the customer count on each enterprise record.",
    resolve: async (_programId, roster) =>
      sumOver(roster.businesses, "numberOfCustomers"),
  },

  milestones_completed: {
    label: "Milestones completed",
    unit: "milestones",
    automatic: true,
    describes: "Counted from milestone records for the programme's roster.",
    resolve: async (_programId, roster) => {
      if (roster.businessIds.length === 0) return 0;
      return Milestone.count({
        where: {
          businessId: { [Op.in]: roster.businessIds },
          status: "completed",
        },
      });
    },
  },

  coaching_sessions: {
    label: "Coaching sessions delivered",
    unit: "sessions",
    automatic: true,
    describes: "Counted from coaching sessions logged against the programme.",
    resolve: async (programId) =>
      TrackerSession.count({ where: { cohortProgramId: programId } }),
  },

  investment_readiness: {
    label: "Average investment readiness",
    unit: "%",
    automatic: true,
    describes:
      "Averaged from the overall score of each enterprise's published CRAT assessment.",
    resolve: async (_programId, roster) => {
      if (roster.businessIds.length === 0) return null;

      const assessments = await CratAssessment.findAll({
        attributes: ["id", "business_id"],
        where: {
          business_id: { [Op.in]: roster.businessIds },
          status: "published",
        },
        raw: true,
      });

      if (assessments.length === 0) return null;

      const snapshots = await CratScoreSnapshot.findAll({
        attributes: ["assessment_id", "overall_percent"],
        where: { assessment_id: { [Op.in]: assessments.map((r) => r.id) } },
        order: [["generated_at", "DESC"]],
        raw: true,
      });

      // One score per enterprise: the most recent published assessment.
      const businessByAssessment = new Map(
        assessments.map((row) => [row.id, row.business_id]),
      );
      const latest = new Map();

      for (const row of snapshots) {
        const businessId = businessByAssessment.get(row.assessment_id);
        if (businessId === undefined || latest.has(businessId)) continue;
        latest.set(businessId, Number(row.overall_percent));
      }

      return averageOver([...latest.values()]);
    },
  },

  survey_responses: {
    label: "Survey responses received",
    unit: "responses",
    automatic: true,
    describes: "Counted from submitted responses to the programme's surveys.",
    resolve: async (programId) => {
      const surveys = await Survey.findAll({
        attributes: ["id"],
        where: { cohortProgramId: programId },
        raw: true,
      });

      if (surveys.length === 0) return 0;

      return SurveyResponse.count({
        where: {
          surveyId: { [Op.in]: surveys.map((row) => row.id) },
          submittedAt: { [Op.ne]: null },
        },
      });
    },
  },

  quiz_attempts: {
    label: "Assessments attempted",
    unit: "attempts",
    automatic: true,
    describes: "Counted from quiz attempts on the programme's modules.",
    resolve: async (programId) => {
      const modules = await Module.findAll({
        attributes: ["id"],
        where: { cohortProgramId: programId },
        raw: true,
      });

      if (modules.length === 0) return 0;

      const quizzes = await Quiz.findAll({
        attributes: ["id"],
        where: { moduleId: { [Op.in]: modules.map((row) => row.id) } },
        raw: true,
      });

      if (quizzes.length === 0) return 0;

      return QuizAttempt.count({
        where: { quizId: { [Op.in]: quizzes.map((row) => row.id) } },
      });
    },
  },
};

const SOURCE_KEYS = Object.keys(SOURCES);

const isAutomatic = (key) => !!(SOURCES[key] && SOURCES[key].automatic);

// The catalogue the indicator form offers, without the resolver functions.
const sourceCatalogue = () =>
  SOURCE_KEYS.map((key) => ({
    value: key,
    label: SOURCES[key].label,
    unit: SOURCES[key].unit,
    automatic: SOURCES[key].automatic,
    describes: SOURCES[key].describes,
  }));

// Compute every automatic source a programme's indicators need, once. A
// source that throws is reported as null rather than failing the whole
// dashboard — one broken figure should not blank the page.
const resolveSources = async (cohortProgramId, keys = []) => {
  const wanted = [...new Set(keys)].filter(isAutomatic);
  if (wanted.length === 0) return {};

  const roster = await programmeRoster(cohortProgramId);
  const resolved = {};

  for (const key of wanted) {
    try {
      resolved[key] = await SOURCES[key].resolve(cohortProgramId, roster);
    } catch (error) {
      console.error("M&E source failed:", key, error.message);
      resolved[key] = null;
    }
  }

  return resolved;
};

module.exports = {
  SOURCES,
  SOURCE_KEYS,
  isAutomatic,
  sourceCatalogue,
  resolveSources,
  programmeRoster,
};
