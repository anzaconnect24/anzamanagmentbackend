const { errorResponse, successResponse } = require("../../utils/responses");
const {
  MeFramework,
  MeResult,
  MeIndicator,
  MeIndicatorValue,
  MeAuditLog,
  CohortProgram,
  CohortMembership,
  User,
  sequelize,
} = require("../../models");
const { Op } = require("sequelize");
const {
  achievementPercent,
  indicatorStatus,
  programmeProgressPercent,
  dataQualityScore,
  DEFAULT_THRESHOLDS,
  STATUSES,
} = require("./me.calculations");
const {
  SOURCES,
  isAutomatic,
  sourceCatalogue,
  resolveSources,
} = require("./me.sources");

// Every handler resolves the programme from the url and works only inside it,
// so M&E data can never leak between programmes.
const findProgramme = (uuid) => CohortProgram.findOne({ where: { uuid } });

// The framework is created on first use rather than requiring a setup step, so
// opening M&E on a new programme just works.
const frameworkFor = async (programme, actor) => {
  const [framework] = await MeFramework.findOrCreate({
    where: { cohortProgramId: programme.id },
    defaults: {
      cohortProgramId: programme.id,
      createdById: actor ? actor.id : null,
    },
  });

  return framework;
};

// Nothing is written without a trail. Failing to log must not fail the write
// itself, but it is loud in the server log if it happens.
const audit = async (req, entry) => {
  try {
    await MeAuditLog.create({
      ...entry,
      actorId: req.user ? req.user.id : null,
      actorRole: req.user ? req.user.role : null,
    });
  } catch (error) {
    console.error("M&E audit log failed:", error.message);
  }
};

// The fields that actually changed, as { field: { from, to } }, so the trail
// records what a value was before it was overwritten.
const diff = (before, after, fields) => {
  const changes = {};

  for (const field of fields) {
    if (after[field] === undefined) continue;

    const from = before[field] === undefined ? null : before[field];
    const to = after[field];

    if (String(from ?? "") !== String(to ?? "")) {
      changes[field] = { from, to };
    }
  }

  return Object.keys(changes).length ? changes : null;
};

const thresholdsOf = (framework) => ({
  onTrack: framework ? framework.onTrackThreshold : DEFAULT_THRESHOLDS.onTrack,
  attention: framework
    ? framework.attentionThreshold
    : DEFAULT_THRESHOLDS.attention,
});

// The actual for one indicator, and where it came from.
//
// Automatic indicators are computed from platform records and count as
// verified: nobody typed them, so there is nothing to dispute. Manual ones use
// the verified figure, falling back to what was reported only when the
// programme has chosen to include self-reported data.
const actualFor = (indicator, computed, values, includeSelfReported) => {
  if (isAutomatic(indicator.dataSource)) {
    const value = computed[indicator.dataSource];
    return {
      actual: value === undefined ? null : value,
      basis: "automatic",
      verified: true,
    };
  }

  const mine = values.filter((row) => row.indicatorId === indicator.id);
  if (mine.length === 0) return { actual: null, basis: "none", verified: false };

  // Newest first, so the current figure is the latest one reported.
  const latest = mine[0];

  if (latest.verificationStatus === "verified") {
    const value =
      latest.verifiedValue !== null ? latest.verifiedValue : latest.value;
    return { actual: Number(value), basis: "verified", verified: true };
  }

  if (!includeSelfReported) {
    return { actual: null, basis: "unverified_excluded", verified: false };
  }

  return {
    actual: latest.value === null ? null : Number(latest.value),
    basis: "self_reported",
    verified: false,
  };
};

// Everything an indicator row needs: its target, its actual, the achievement
// between them and the status that follows.
const buildRows = (indicators, computed, values, framework) => {
  const thresholds = thresholdsOf(framework);
  const includeSelfReported = framework ? framework.includeSelfReported : false;

  return indicators.map((indicator) => {
    const { actual, basis, verified } = actualFor(
      indicator,
      computed,
      values,
      includeSelfReported,
    );

    const target =
      indicator.targetValue === null ? null : Number(indicator.targetValue);
    const baseline =
      indicator.baselineValue === null ? null : Number(indicator.baselineValue);

    const achievement = achievementPercent(actual, target, {
      higherIsBetter: indicator.higherIsBetter,
    });

    const status = indicatorStatus(achievement, thresholds, {
      targetDate: indicator.targetDate,
      hasActual: actual !== null,
    });

    return {
      uuid: indicator.uuid,
      code: indicator.code,
      name: indicator.name,
      description: indicator.description,
      resultLevel: indicator.resultLevel,
      indicatorType: indicator.indicatorType,
      unit: indicator.unit,
      frequency: indicator.frequency,
      dataSource: indicator.dataSource,
      dataSourceLabel: SOURCES[indicator.dataSource]
        ? SOURCES[indicator.dataSource].label
        : indicator.dataSource,
      automatic: isAutomatic(indicator.dataSource),
      higherIsBetter: indicator.higherIsBetter,
      resultUuid: indicator.MeResult ? indicator.MeResult.uuid : null,
      baseline,
      target,
      targetDate: indicator.targetDate,
      actual,
      achievement,
      status,
      // How much the figure can be trusted, so the UI never presents an
      // unverified number as an official result.
      basis,
      verified,
    };
  });
};

// Indicators of one programme, with the values reported against them.
const loadIndicators = async (programme) => {
  const indicators = await MeIndicator.findAll({
    where: {
      cohortProgramId: programme.id,
      status: { [Op.ne]: "archived" },
    },
    include: [{ model: MeResult, required: false, attributes: ["uuid"] }],
    order: [
      ["position", "ASC"],
      ["createdAt", "ASC"],
    ],
  });

  const values = indicators.length
    ? await MeIndicatorValue.findAll({
        where: {
          indicatorId: { [Op.in]: indicators.map((row) => row.id) },
          businessId: null,
        },
        order: [["createdAt", "DESC"]],
        raw: true,
      })
    : [];

  const computed = await resolveSources(
    programme.id,
    indicators.map((row) => row.dataSource),
  );

  return { indicators, values, computed };
};

// ---------------------------------------------------------------- overview

const getOverview = async (req, res) => {
  try {
    const programme = await findProgramme(req.params.uuid);

    if (!programme) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    const framework = await frameworkFor(programme, req.user);
    const { indicators, values, computed } = await loadIndicators(programme);
    const rows = buildRows(indicators, computed, values, framework);

    const enterprises = await CohortMembership.count({
      where: { cohortProgramId: programme.id },
    });

    const pendingVerification = values.filter((row) =>
      ["reported", "evidence_submitted", "under_verification"].includes(
        row.verificationStatus,
      ),
    ).length;

    // Data quality over the indicators the programme has defined: how many
    // carry a figure at all, and how many of those are verified.
    const withActual = rows.filter((row) => row.actual !== null).length;
    const verified = rows.filter((row) => row.verified).length;

    successResponse(res, {
      program: programme,
      framework: {
        uuid: framework.uuid,
        goal: framework.goal,
        onTrackThreshold: framework.onTrackThreshold,
        attentionThreshold: framework.attentionThreshold,
        includeSelfReported: framework.includeSelfReported,
      },
      summary: {
        totalIndicators: rows.length,
        onTrack: rows.filter((row) => row.status === STATUSES.ON_TRACK).length,
        attention: rows.filter((row) => row.status === STATUSES.ATTENTION)
          .length,
        behind: rows.filter((row) => row.status === STATUSES.BEHIND).length,
        notDue: rows.filter((row) => row.status === STATUSES.NOT_DUE).length,
        enterprises,
        pendingVerification,
        // Null while nothing is due — the UI shows a dash, not a 0%.
        programmeProgress: programmeProgressPercent(
          rows.map((row) => row.status),
        ),
        dataQuality: dataQualityScore({
          expected: rows.length,
          present: withActual,
          verified,
          flagged: 0,
        }),
      },
      indicators: rows,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// ------------------------------------------------------- results framework

const shapeResult = (result, indicatorsByResult) => ({
  uuid: result.uuid,
  level: result.level,
  code: result.code,
  title: result.title,
  description: result.description,
  position: result.position,
  indicators: indicatorsByResult.get(result.id) || [],
  children: [],
});

const getFramework = async (req, res) => {
  try {
    const programme = await findProgramme(req.params.uuid);

    if (!programme) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    const framework = await frameworkFor(programme, req.user);

    const results = await MeResult.findAll({
      where: { frameworkId: framework.id, archivedAt: null },
      order: [
        ["position", "ASC"],
        ["createdAt", "ASC"],
      ],
    });

    const { indicators, values, computed } = await loadIndicators(programme);
    const rows = buildRows(indicators, computed, values, framework);

    // Index the computed rows by the result they hang off.
    const indicatorsByResult = new Map();
    const unattached = [];

    indicators.forEach((indicator, index) => {
      const row = rows[index];
      if (!indicator.resultId) {
        unattached.push(row);
        return;
      }
      const list = indicatorsByResult.get(indicator.resultId) || [];
      list.push(row);
      indicatorsByResult.set(indicator.resultId, list);
    });

    // Outcomes at the top, their outputs nested underneath.
    const byUuid = new Map();
    const tree = [];

    for (const result of results) {
      byUuid.set(result.id, shapeResult(result, indicatorsByResult));
    }

    for (const result of results) {
      const node = byUuid.get(result.id);
      const parent = result.parentId ? byUuid.get(result.parentId) : null;

      if (parent) parent.children.push(node);
      else tree.push(node);
    }

    successResponse(res, {
      program: programme,
      framework: {
        uuid: framework.uuid,
        goal: framework.goal,
        onTrackThreshold: framework.onTrackThreshold,
        attentionThreshold: framework.attentionThreshold,
        includeSelfReported: framework.includeSelfReported,
      },
      outcomes: tree,
      // Indicators measuring the goal directly.
      goalIndicators: unattached,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateFramework = async (req, res) => {
  try {
    const programme = await findProgramme(req.params.uuid);

    if (!programme) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    const framework = await frameworkFor(programme, req.user);
    const { goal, onTrackThreshold, attentionThreshold, includeSelfReported } =
      req.body;

    const onTrack = Number(onTrackThreshold);
    const attention = Number(attentionThreshold);

    if (
      Number.isFinite(onTrack) &&
      Number.isFinite(attention) &&
      attention >= onTrack
    ) {
      return res.status(400).json({
        status: false,
        message:
          "The attention threshold must be lower than the on-track threshold",
      });
    }

    const before = framework.toJSON();

    const next = {
      goal: goal !== undefined ? goal : framework.goal,
      onTrackThreshold: Number.isFinite(onTrack)
        ? onTrack
        : framework.onTrackThreshold,
      attentionThreshold: Number.isFinite(attention)
        ? attention
        : framework.attentionThreshold,
      includeSelfReported:
        includeSelfReported !== undefined
          ? !!includeSelfReported
          : framework.includeSelfReported,
    };

    await framework.update(next);

    await audit(req, {
      cohortProgramId: programme.id,
      entityType: "MeFramework",
      entityId: framework.id,
      entityUuid: framework.uuid,
      action: "update",
      changes: diff(before, next, [
        "goal",
        "onTrackThreshold",
        "attentionThreshold",
        "includeSelfReported",
      ]),
    });

    successResponse(res, { uuid: framework.uuid });
  } catch (error) {
    errorResponse(res, error);
  }
};

// An outcome, or an output beneath one.
const createResult = async (req, res) => {
  try {
    const programme = await findProgramme(req.params.uuid);

    if (!programme) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    const framework = await frameworkFor(programme, req.user);
    const { title, description, code, level, parentUuid } = req.body;

    if (!String(title || "").trim()) {
      return res
        .status(400)
        .json({ status: false, message: "A title is required" });
    }

    let parent = null;

    if (parentUuid) {
      parent = await MeResult.findOne({
        where: { uuid: parentUuid, frameworkId: framework.id },
      });

      if (!parent) {
        return res
          .status(404)
          .json({ status: false, message: "Parent outcome not found" });
      }

      // The tree is two deep on purpose: outcomes, then outputs.
      if (parent.level === "output") {
        return res.status(400).json({
          status: false,
          message: "An output cannot sit under another output",
        });
      }
    }

    const siblings = await MeResult.count({
      where: {
        frameworkId: framework.id,
        parentId: parent ? parent.id : null,
      },
    });

    const result = await MeResult.create({
      frameworkId: framework.id,
      parentId: parent ? parent.id : null,
      level: parent ? "output" : MeResult.LEVELS.includes(level) ? level : "outcome",
      code: code || null,
      title: String(title).trim(),
      description: description || null,
      position: siblings,
    });

    await audit(req, {
      cohortProgramId: programme.id,
      entityType: "MeResult",
      entityId: result.id,
      entityUuid: result.uuid,
      action: "create",
      changes: { title: { from: null, to: result.title } },
    });

    successResponse(res, { uuid: result.uuid });
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateResult = async (req, res) => {
  try {
    const programme = await findProgramme(req.params.uuid);

    if (!programme) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    const framework = await frameworkFor(programme, req.user);

    const result = await MeResult.findOne({
      where: { uuid: req.params.resultUuid, frameworkId: framework.id },
    });

    if (!result) {
      return res
        .status(404)
        .json({ status: false, message: "Result not found" });
    }

    const before = result.toJSON();
    const { title, description, code, position } = req.body;

    const next = {
      title: title !== undefined ? String(title).trim() : result.title,
      description: description !== undefined ? description : result.description,
      code: code !== undefined ? code : result.code,
      position: Number.isFinite(Number(position))
        ? Number(position)
        : result.position,
    };

    await result.update(next);

    await audit(req, {
      cohortProgramId: programme.id,
      entityType: "MeResult",
      entityId: result.id,
      entityUuid: result.uuid,
      action: "update",
      changes: diff(before, next, ["title", "description", "code", "position"]),
    });

    successResponse(res, { uuid: result.uuid });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Archiving, not deleting: the framework a result belonged to has to stay
// readable for audit long after it stops being tracked.
const archiveResult = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const programme = await findProgramme(req.params.uuid);

    if (!programme) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    const framework = await frameworkFor(programme, req.user);

    const result = await MeResult.findOne({
      where: { uuid: req.params.resultUuid, frameworkId: framework.id },
    });

    if (!result) {
      await transaction.rollback();
      return res
        .status(404)
        .json({ status: false, message: "Result not found" });
    }

    const now = new Date();

    await result.update({ archivedAt: now }, { transaction });

    // Outputs go with their outcome, and the indicators under both are
    // detached rather than destroyed.
    const children = await MeResult.findAll({
      attributes: ["id"],
      where: { parentId: result.id },
      raw: true,
      transaction,
    });

    const ids = [result.id, ...children.map((row) => row.id)];

    if (children.length) {
      await MeResult.update(
        { archivedAt: now },
        { where: { id: { [Op.in]: children.map((row) => row.id) } }, transaction },
      );
    }

    await MeIndicator.update(
      { resultId: null },
      { where: { resultId: { [Op.in]: ids } }, transaction },
    );

    await transaction.commit();

    await audit(req, {
      cohortProgramId: programme.id,
      entityType: "MeResult",
      entityId: result.id,
      entityUuid: result.uuid,
      action: "archive",
      comments: "Indicators beneath it were detached, not deleted",
    });

    successResponse(res, { archived: true });
  } catch (error) {
    await transaction.rollback();
    errorResponse(res, error);
  }
};

// ------------------------------------------------------------- indicators

const INDICATOR_FIELDS = [
  "code",
  "name",
  "description",
  "definition",
  "resultLevel",
  "indicatorType",
  "unit",
  "baselineValue",
  "targetValue",
  "targetDate",
  "frequency",
  "dataSource",
  "responsiblePerson",
  "verificationMethod",
  "calculationMethod",
  "higherIsBetter",
  "status",
  "notes",
];

// Everything the indicator form needs to render: the source catalogue and the
// enumerations, so the options can never drift from what the API accepts.
const getCatalogue = async (_req, res) => {
  try {
    successResponse(res, {
      sources: sourceCatalogue(),
      resultLevels: MeIndicator.RESULT_LEVELS,
      types: MeIndicator.TYPES,
      frequencies: MeIndicator.FREQUENCIES,
      statuses: MeIndicator.STATUSES,
      disaggregation: [
        "gender_of_founder",
        "age_category",
        "youth_led",
        "women_led",
        "region",
        "district",
        "sector",
        "subsector",
        "cohort",
        "enterprise_stage",
        "business_size",
        "funding_type",
        "urban_rural",
      ],
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getIndicators = async (req, res) => {
  try {
    const programme = await findProgramme(req.params.uuid);

    if (!programme) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    const framework = await frameworkFor(programme, req.user);
    const { indicators, values, computed } = await loadIndicators(programme);

    successResponse(res, {
      program: programme,
      data: buildRows(indicators, computed, values, framework),
      count: indicators.length,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const readIndicatorPayload = (body) => {
  const payload = {};

  for (const field of INDICATOR_FIELDS) {
    if (body[field] === undefined) continue;
    payload[field] = body[field];
  }

  // Empty strings from a form are absent values, not zeros.
  for (const numeric of ["baselineValue", "targetValue"]) {
    if (payload[numeric] === "" || payload[numeric] === null) {
      payload[numeric] = null;
    }
  }

  if (payload.targetDate === "") payload.targetDate = null;

  if (Array.isArray(body.disaggregation)) {
    payload.disaggregation = body.disaggregation;
  }

  return payload;
};

const validateIndicator = (payload) => {
  if (payload.name !== undefined && !String(payload.name).trim()) {
    return "An indicator name is required";
  }

  if (
    payload.dataSource !== undefined &&
    !Object.keys(SOURCES).includes(payload.dataSource)
  ) {
    return "Unknown data source";
  }

  for (const [field, allowed] of [
    ["resultLevel", MeIndicator.RESULT_LEVELS],
    ["indicatorType", MeIndicator.TYPES],
    ["frequency", MeIndicator.FREQUENCIES],
    ["status", MeIndicator.STATUSES],
  ]) {
    if (payload[field] !== undefined && !allowed.includes(payload[field])) {
      return `${field} must be one of ${allowed.join(", ")}`;
    }
  }

  for (const numeric of ["baselineValue", "targetValue"]) {
    if (payload[numeric] === null || payload[numeric] === undefined) continue;
    if (!Number.isFinite(Number(payload[numeric]))) {
      return `${numeric} must be a number`;
    }
  }

  return null;
};

const createIndicator = async (req, res) => {
  try {
    const programme = await findProgramme(req.params.uuid);

    if (!programme) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    const framework = await frameworkFor(programme, req.user);
    const payload = readIndicatorPayload(req.body);

    if (!payload.name) {
      return res
        .status(400)
        .json({ status: false, message: "An indicator name is required" });
    }

    const problem = validateIndicator(payload);
    if (problem) return res.status(400).json({ status: false, message: problem });

    let resultId = null;

    if (req.body.resultUuid) {
      const result = await MeResult.findOne({
        where: { uuid: req.body.resultUuid, frameworkId: framework.id },
      });

      if (!result) {
        return res
          .status(404)
          .json({ status: false, message: "Result not found" });
      }

      resultId = result.id;
    }

    const position = await MeIndicator.count({
      where: { cohortProgramId: programme.id },
    });

    const indicator = await MeIndicator.create({
      ...payload,
      cohortProgramId: programme.id,
      resultId,
      position,
      createdById: req.user ? req.user.id : null,
    });

    await audit(req, {
      cohortProgramId: programme.id,
      entityType: "MeIndicator",
      entityId: indicator.id,
      entityUuid: indicator.uuid,
      action: "create",
      changes: {
        name: { from: null, to: indicator.name },
        targetValue: { from: null, to: indicator.targetValue },
      },
    });

    successResponse(res, { uuid: indicator.uuid });
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateIndicator = async (req, res) => {
  try {
    const programme = await findProgramme(req.params.uuid);

    if (!programme) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    const indicator = await MeIndicator.findOne({
      where: {
        uuid: req.params.indicatorUuid,
        cohortProgramId: programme.id,
      },
    });

    if (!indicator) {
      return res
        .status(404)
        .json({ status: false, message: "Indicator not found" });
    }

    const payload = readIndicatorPayload(req.body);
    const problem = validateIndicator(payload);
    if (problem) return res.status(400).json({ status: false, message: problem });

    if (req.body.resultUuid !== undefined) {
      if (!req.body.resultUuid) {
        payload.resultId = null;
      } else {
        const framework = await frameworkFor(programme, req.user);
        const result = await MeResult.findOne({
          where: { uuid: req.body.resultUuid, frameworkId: framework.id },
        });

        if (!result) {
          return res
            .status(404)
            .json({ status: false, message: "Result not found" });
        }

        payload.resultId = result.id;
      }
    }

    const before = indicator.toJSON();

    await indicator.update(payload);

    await audit(req, {
      cohortProgramId: programme.id,
      entityType: "MeIndicator",
      entityId: indicator.id,
      entityUuid: indicator.uuid,
      action: "update",
      changes: diff(before, payload, INDICATOR_FIELDS),
    });

    successResponse(res, { uuid: indicator.uuid });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Archive rather than delete. A verified result that fed a donor report must
// stay in the record.
const archiveIndicator = async (req, res) => {
  try {
    const programme = await findProgramme(req.params.uuid);

    if (!programme) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    const indicator = await MeIndicator.findOne({
      where: {
        uuid: req.params.indicatorUuid,
        cohortProgramId: programme.id,
      },
    });

    if (!indicator) {
      return res
        .status(404)
        .json({ status: false, message: "Indicator not found" });
    }

    await indicator.update({ status: "archived", archivedAt: new Date() });

    await audit(req, {
      cohortProgramId: programme.id,
      entityType: "MeIndicator",
      entityId: indicator.id,
      entityUuid: indicator.uuid,
      action: "archive",
    });

    successResponse(res, { archived: true });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Record an actual for a manual indicator. Automatic ones are refused: their
// figure comes from platform records and overwriting it by hand would make the
// dashboard disagree with the data behind it.
const submitIndicatorValue = async (req, res) => {
  try {
    const programme = await findProgramme(req.params.uuid);

    if (!programme) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    const indicator = await MeIndicator.findOne({
      where: {
        uuid: req.params.indicatorUuid,
        cohortProgramId: programme.id,
      },
    });

    if (!indicator) {
      return res
        .status(404)
        .json({ status: false, message: "Indicator not found" });
    }

    if (isAutomatic(indicator.dataSource)) {
      return res.status(400).json({
        status: false,
        message:
          "This indicator is calculated from platform records and cannot be entered by hand",
      });
    }

    const value = Number(req.body.value);

    if (req.body.value !== null && !Number.isFinite(value)) {
      return res
        .status(400)
        .json({ status: false, message: "A numeric value is required" });
    }

    // A new row every time, so the previous figure is never overwritten.
    const record = await MeIndicatorValue.create({
      indicatorId: indicator.id,
      value,
      narrative: req.body.narrative || null,
      origin: "manual",
      verificationStatus: "reported",
      submittedById: req.user ? req.user.id : null,
      submittedAt: new Date(),
    });

    await audit(req, {
      cohortProgramId: programme.id,
      entityType: "MeIndicatorValue",
      entityId: record.id,
      entityUuid: record.uuid,
      action: "report",
      changes: { value: { from: null, to: value } },
      comments: req.body.narrative || null,
    });

    successResponse(res, { uuid: record.uuid });
  } catch (error) {
    errorResponse(res, error);
  }
};

// The history behind one indicator: every figure reported for it, newest
// first, with who reported it and what became of it.
const getIndicatorHistory = async (req, res) => {
  try {
    const programme = await findProgramme(req.params.uuid);

    if (!programme) {
      return res
        .status(404)
        .json({ status: false, message: "Program not found" });
    }

    const indicator = await MeIndicator.findOne({
      where: {
        uuid: req.params.indicatorUuid,
        cohortProgramId: programme.id,
      },
    });

    if (!indicator) {
      return res
        .status(404)
        .json({ status: false, message: "Indicator not found" });
    }

    const values = await MeIndicatorValue.findAll({
      where: { indicatorId: indicator.id },
      order: [["createdAt", "DESC"]],
    });

    const trail = await MeAuditLog.findAll({
      where: {
        cohortProgramId: programme.id,
        entityType: { [Op.in]: ["MeIndicator", "MeIndicatorValue"] },
        [Op.or]: [
          { entityId: indicator.id, entityType: "MeIndicator" },
          {
            entityId: { [Op.in]: values.map((row) => row.id).concat([0]) },
            entityType: "MeIndicatorValue",
          },
        ],
      },
      include: [
        { model: User, as: "actor", required: false, attributes: ["name", "email"] },
      ],
      order: [["createdAt", "DESC"]],
      limit: 100,
    });

    successResponse(res, {
      indicator: {
        uuid: indicator.uuid,
        name: indicator.name,
        automatic: isAutomatic(indicator.dataSource),
      },
      values: values.map((row) => ({
        uuid: row.uuid,
        value: row.value === null ? null : Number(row.value),
        verifiedValue:
          row.verifiedValue === null ? null : Number(row.verifiedValue),
        verificationStatus: row.verificationStatus,
        origin: row.origin,
        narrative: row.narrative,
        submittedAt: row.submittedAt,
      })),
      audit: trail.map((row) => ({
        uuid: row.uuid,
        action: row.action,
        changes: row.changes,
        comments: row.comments,
        actor: row.actor ? row.actor.name || row.actor.email : null,
        actorRole: row.actorRole,
        at: row.createdAt,
      })),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  getOverview,
  getFramework,
  updateFramework,
  createResult,
  updateResult,
  archiveResult,
  getCatalogue,
  getIndicators,
  createIndicator,
  updateIndicator,
  archiveIndicator,
  submitIndicatorValue,
  getIndicatorHistory,
};
