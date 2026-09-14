const { Op } = require("sequelize");
const { successResponse, errorResponse } = require("../../utils/responses");
const {
  CohortProgram,
  CohortProgramLead,
  CohortMembership,
  Business,
  User,
  Notification,
  ProgramTarget,
  ProgramTargetSubmission,
  sequelize,
} = require("../../models");

// Programme milestones and KPIs. A Business Development Advisor defines them on
// a programme; every startup on it fills in its line against each and submits;
// the advisor approves each line or sends it back.

const KINDS = ["milestone", "kpi"];
const COMPLETION_STATUSES = ["not_started", "in_progress", "completed"];
const DECISIONS = ["approved", "revision_requested"];

// A startup can change its line while it is a draft or has been sent back.
// Once submitted it waits for the advisor; once approved it is settled.
const EDITABLE_STATUSES = ["draft", "revision_requested"];

// Who reads a programme's targets and the startups' lines. Setting targets and
// reviewing lines is narrower — see canManage.
const VIEW_ROLES = ["Admin", "BDA", "ME", "Finance"];

const clip = (text, max = 255) => String(text ?? "").trim().slice(0, max);

const notify = async (rows) => {
  try {
    if (rows.length) {
      await Notification.bulkCreate(rows.map((row) => ({ ...row, message: clip(row.message) })));
    }
  } catch (error) {
    // A notification failing must never undo the action it announces.
    console.error("Programme target notification failed:", error.message);
  }
};

const findProgram = (uuid) =>
  CohortProgram.findOne({
    where: { uuid, archivedAt: null },
    attributes: ["id", "uuid", "title"],
  });

const isLead = async (req, program) =>
  !!(await CohortProgramLead.findOne({
    where: { cohortProgramId: program.id, userId: req.user.id },
  }));

// Every Business Development Advisor works every programme as its lead would.
const canManage = async (req, program) =>
  ["Admin", "BDA"].includes(req.user.role) || (await isLead(req, program));

const canView = async (req, program) =>
  VIEW_ROLES.includes(req.user.role) || (await isLead(req, program));

const parseUrls = (value) => {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const targetJson = (target) => ({
  uuid: target.uuid,
  kind: target.kind,
  title: target.title,
  description: target.description || "",
  unit: target.unit || "",
  targetValue: target.targetValue || "",
  dueDate: target.dueDate || null,
  evidenceRequired: !!target.evidenceRequired,
  position: target.position,
});

const submissionJson = (submission, usersById = new Map()) =>
  submission
    ? {
        uuid: submission.uuid,
        value: submission.value || "",
        completionStatus: submission.completionStatus || "",
        narrative: submission.narrative || "",
        evidenceUrls: parseUrls(submission.evidenceUrls),
        status: submission.status,
        submittedAt: submission.submittedAt,
        reviewedAt: submission.reviewedAt,
        reviewNotes: submission.reviewNotes || "",
        reviewer: usersById.get(submission.reviewedById)?.name || null,
      }
    : null;

const programTargets = (cohortProgramIds) =>
  ProgramTarget.findAll({
    where: { cohortProgramId: { [Op.in]: cohortProgramIds }, archivedAt: null },
    order: [
      ["position", "ASC"],
      ["id", "ASC"],
    ],
  });

// The fields a target is written from, checked. Returns { error } or { data }.
const readTargetInput = (body = {}) => {
  const kind = String(body.kind || "").trim();
  if (!KINDS.includes(kind)) return { error: "Choose whether this is a milestone or a KPI" };

  const title = clip(body.title);
  if (!title) return { error: "Every milestone and KPI needs a title" };

  const dueDate = body.dueDate ? String(body.dueDate).slice(0, 10) : null;
  if (dueDate && Number.isNaN(new Date(dueDate).getTime())) {
    return { error: "The due date is not a valid date" };
  }

  return {
    data: {
      kind,
      title,
      description: clip(body.description, 5000) || null,
      unit: kind === "kpi" ? clip(body.unit, 60) || null : null,
      targetValue: clip(body.targetValue) || null,
      dueDate,
      evidenceRequired: !!body.evidenceRequired,
    },
  };
};

// ---- Advisor side ------------------------------------------------------------

// The programme's targets, and every active startup's line against each.
const getProgramTargets = async (req, res) => {
  try {
    const program = await findProgram(req.params.uuid);
    if (!program) return res.status(404).json({ status: false, message: "Program not found" });
    if (!(await canView(req, program))) {
      return res.status(403).json({ status: false, message: "You are not assigned to this program" });
    }

    const targets = await programTargets([program.id]);
    const memberships = await CohortMembership.findAll({
      where: { cohortProgramId: program.id, status: "active" },
      attributes: ["businessId"],
      include: [{ model: Business, required: true, attributes: ["id", "uuid", "name", "userId"] }],
    });

    const submissions = targets.length
      ? await ProgramTargetSubmission.findAll({
          where: { targetId: { [Op.in]: targets.map((t) => t.id) } },
        })
      : [];

    const userIds = [
      ...memberships.map((m) => m.Business.userId),
      ...submissions.map((s) => s.reviewedById),
    ].filter(Boolean);
    const users = userIds.length
      ? await User.findAll({ where: { id: { [Op.in]: [...new Set(userIds)] } }, attributes: ["id", "name"] })
      : [];
    const usersById = new Map(users.map((u) => [u.id, u]));
    const targetUuidById = new Map(targets.map((t) => [t.id, t.uuid]));

    const startups = memberships
      .map((membership) => {
        const business = membership.Business;
        const lines = {};
        submissions
          .filter((s) => s.businessId === business.id)
          .forEach((s) => {
            lines[targetUuidById.get(s.targetId)] = submissionJson(s, usersById);
          });
        const statuses = Object.values(lines).map((line) => line.status);

        return {
          businessUuid: business.uuid,
          name: business.name,
          founder: usersById.get(business.userId)?.name || "",
          submissions: lines,
          counts: {
            total: targets.length,
            submitted: statuses.filter((s) => s === "submitted").length,
            approved: statuses.filter((s) => s === "approved").length,
            revisionRequested: statuses.filter((s) => s === "revision_requested").length,
          },
        };
      })
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));

    successResponse(res, {
      program: { uuid: program.uuid, title: program.title },
      canEdit: await canManage(req, program),
      targets: targets.map(targetJson),
      startups,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const createTarget = async (req, res) => {
  try {
    const program = await findProgram(req.params.uuid);
    if (!program) return res.status(404).json({ status: false, message: "Program not found" });
    if (!(await canManage(req, program))) {
      return res.status(403).json({ status: false, message: "You cannot set targets on this program" });
    }

    const { error, data } = readTargetInput(req.body);
    if (error) return res.status(400).json({ status: false, message: error });

    const last = await ProgramTarget.max("position", { where: { cohortProgramId: program.id } });
    const target = await ProgramTarget.create({
      ...data,
      cohortProgramId: program.id,
      position: (Number.isFinite(last) ? last : -1) + 1,
      createdById: req.user.id,
    });

    successResponse(res, targetJson(target));
  } catch (error) {
    errorResponse(res, error);
  }
};

const findProgramTarget = (program, targetUuid) =>
  ProgramTarget.findOne({
    where: { uuid: targetUuid, cohortProgramId: program.id, archivedAt: null },
  });

const updateTarget = async (req, res) => {
  try {
    const program = await findProgram(req.params.uuid);
    if (!program) return res.status(404).json({ status: false, message: "Program not found" });
    if (!(await canManage(req, program))) {
      return res.status(403).json({ status: false, message: "You cannot set targets on this program" });
    }

    const target = await findProgramTarget(program, req.params.targetUuid);
    if (!target) return res.status(404).json({ status: false, message: "Target not found" });

    const { error, data } = readTargetInput({ kind: target.kind, ...req.body });
    if (error) return res.status(400).json({ status: false, message: error });

    await target.update(data);
    successResponse(res, targetJson(target));
  } catch (error) {
    errorResponse(res, error);
  }
};

// Deleted outright while nobody has reported against it; archived once someone
// has, so their lines stay on record.
const removeTarget = async (req, res) => {
  try {
    const program = await findProgram(req.params.uuid);
    if (!program) return res.status(404).json({ status: false, message: "Program not found" });
    if (!(await canManage(req, program))) {
      return res.status(403).json({ status: false, message: "You cannot set targets on this program" });
    }

    const target = await findProgramTarget(program, req.params.targetUuid);
    if (!target) return res.status(404).json({ status: false, message: "Target not found" });

    const reported = await ProgramTargetSubmission.count({ where: { targetId: target.id } });
    if (reported) await target.update({ archivedAt: new Date() });
    else await target.destroy();

    successResponse(res, { archived: !!reported });
  } catch (error) {
    errorResponse(res, error);
  }
};

const reviewSubmission = async (req, res) => {
  try {
    const program = await findProgram(req.params.uuid);
    if (!program) return res.status(404).json({ status: false, message: "Program not found" });
    if (!(await canManage(req, program))) {
      return res.status(403).json({ status: false, message: "You cannot review this program" });
    }

    const decision = String(req.body.decision || "");
    const notes = clip(req.body.notes, 5000);
    if (!DECISIONS.includes(decision)) {
      return res.status(400).json({ status: false, message: "Choose approve or request further information" });
    }
    if (decision === "revision_requested" && !notes) {
      return res.status(400).json({ status: false, message: "Say what further information is needed" });
    }

    const submission = await ProgramTargetSubmission.findOne({
      where: { uuid: req.params.submissionUuid },
      include: [
        {
          model: ProgramTarget,
          as: "target",
          required: true,
          where: { cohortProgramId: program.id },
        },
        { model: Business, attributes: ["id", "name", "userId"] },
      ],
    });
    if (!submission) return res.status(404).json({ status: false, message: "Submission not found" });
    if (submission.status !== "submitted") {
      return res.status(409).json({ status: false, message: "Only a submitted line can be reviewed" });
    }

    await submission.update({
      status: decision,
      reviewNotes: notes || null,
      reviewedById: req.user.id,
      reviewedAt: new Date(),
    });

    if (submission.Business?.userId) {
      await notify([
        {
          userId: submission.Business.userId,
          type: "program_target_reviewed",
          link: "/dashboard/my-programme-targets",
          message:
            decision === "approved"
              ? `"${submission.target.title}" on ${program.title} was approved`
              : `Further information requested on "${submission.target.title}" (${program.title})`,
        },
      ]);
    }

    successResponse(res, submissionJson(submission));
  } catch (error) {
    errorResponse(res, error);
  }
};

// ---- Startup side ------------------------------------------------------------

// Every programme the startup is on, with its targets and the startup's line
// against each.
const getMyTargets = async (req, res) => {
  try {
    const business = await Business.findOne({
      where: { userId: req.user.id },
      attributes: ["id", "uuid", "name"],
    });
    if (!business) return successResponse(res, { business: null, data: [] });

    const memberships = await CohortMembership.findAll({
      where: { businessId: business.id },
      attributes: ["status", "createdAt"],
      include: [
        {
          model: CohortProgram,
          required: true,
          where: { archivedAt: null },
          attributes: ["id", "uuid", "title"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const programIds = memberships.map((m) => m.CohortProgram.id);
    const targets = programIds.length ? await programTargets(programIds) : [];
    const submissions = targets.length
      ? await ProgramTargetSubmission.findAll({
          where: { businessId: business.id, targetId: { [Op.in]: targets.map((t) => t.id) } },
        })
      : [];

    const reviewerIds = [...new Set(submissions.map((s) => s.reviewedById).filter(Boolean))];
    const reviewers = reviewerIds.length
      ? await User.findAll({ where: { id: { [Op.in]: reviewerIds } }, attributes: ["id", "name"] })
      : [];
    const usersById = new Map(reviewers.map((u) => [u.id, u]));
    const submissionByTarget = new Map(submissions.map((s) => [s.targetId, s]));

    const data = memberships.map((membership) => ({
      program: { uuid: membership.CohortProgram.uuid, title: membership.CohortProgram.title },
      membershipStatus: membership.status,
      targets: targets
        .filter((t) => t.cohortProgramId === membership.CohortProgram.id)
        .map((t) => ({
          ...targetJson(t),
          submission: submissionJson(submissionByTarget.get(t.id), usersById),
        })),
    }));

    successResponse(res, { business: { uuid: business.uuid, name: business.name }, data });
  } catch (error) {
    errorResponse(res, error);
  }
};

const hasContent = (line) =>
  !!(line.value || line.completionStatus || line.narrative || line.evidenceUrls.length);

// What a line is still missing before it can be submitted.
const missingFor = (target, line) => {
  if (target.kind === "kpi" && !line.value) return "a reported value";
  if (target.kind === "milestone" && !line.completionStatus) return "a status";
  if (target.evidenceRequired && !line.evidenceUrls.length) return "evidence";
  return null;
};

// Saves the startup's lines on one programme. With `submit`, every line still
// open to the startup must be complete, and all of them go to the advisor.
const saveMySubmissions = async (req, res) => {
  try {
    const program = await findProgram(req.params.uuid);
    if (!program) return res.status(404).json({ status: false, message: "Program not found" });

    const business = await Business.findOne({
      where: { userId: req.user.id },
      attributes: ["id", "name"],
    });
    const membership =
      business &&
      (await CohortMembership.findOne({
        where: { cohortProgramId: program.id, businessId: business.id },
      }));
    if (!membership) {
      return res.status(403).json({ status: false, message: "You are not on this program" });
    }

    const submit = !!req.body.submit;
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const itemsByTarget = new Map(items.map((item) => [String(item?.targetUuid || ""), item]));

    const targets = await programTargets([program.id]);
    const existing = await ProgramTargetSubmission.findAll({
      where: { businessId: business.id, targetId: { [Op.in]: targets.map((t) => t.id) } },
    });
    const existingByTarget = new Map(existing.map((s) => [s.targetId, s]));

    // Lines the startup can still change, with what they would be saved as.
    const open = targets
      .filter((target) => {
        const current = existingByTarget.get(target.id);
        return !current || EDITABLE_STATUSES.includes(current.status);
      })
      .map((target) => {
        const item = itemsByTarget.get(target.uuid);
        const current = existingByTarget.get(target.id);
        const line = item
          ? {
              value: target.kind === "kpi" ? clip(item.value) : "",
              completionStatus:
                target.kind === "milestone" && COMPLETION_STATUSES.includes(item.completionStatus)
                  ? item.completionStatus
                  : "",
              narrative: clip(item.narrative, 5000),
              evidenceUrls: (Array.isArray(item.evidenceUrls) ? item.evidenceUrls : [])
                .map((url) => clip(url, 1000))
                .filter(Boolean)
                .slice(0, 10),
            }
          : {
              value: current?.value || "",
              completionStatus: current?.completionStatus || "",
              narrative: current?.narrative || "",
              evidenceUrls: parseUrls(current?.evidenceUrls),
            };
        return { target, current, line };
      });

    if (submit) {
      if (!open.length) {
        return res.status(400).json({ status: false, message: "There is nothing left to submit" });
      }
      const incomplete = open.find(({ target, line }) => missingFor(target, line));
      if (incomplete) {
        return res.status(400).json({
          status: false,
          message: `"${incomplete.target.title}" needs ${missingFor(incomplete.target, incomplete.line)} before you submit`,
        });
      }
    }

    let saved = 0;
    await sequelize.transaction(async (transaction) => {
      for (const { target, current, line } of open) {
        if (!submit && !current && !hasContent(line)) continue;

        const fields = {
          value: line.value || null,
          completionStatus: line.completionStatus || null,
          narrative: line.narrative || null,
          evidenceUrls: JSON.stringify(line.evidenceUrls),
          status: submit ? "submitted" : current?.status || "draft",
          ...(submit ? { submittedById: req.user.id, submittedAt: new Date() } : {}),
        };

        if (current) await current.update(fields, { transaction });
        else {
          await ProgramTargetSubmission.create(
            { ...fields, targetId: target.id, businessId: business.id },
            { transaction },
          );
        }
        saved += 1;
      }
    });

    if (submit && saved) {
      const leads = await CohortProgramLead.findAll({
        where: { cohortProgramId: program.id },
        attributes: ["userId"],
      });
      const message = `${business.name} submitted ${saved} milestone/KPI update${saved === 1 ? "" : "s"} for ${program.title}`;
      const link = `/dashboard/programManagement/program/${program.uuid}/milestones-kpis`;
      const type = "program_targets_submitted";

      await notify([
        { to: "BDA", type, link, message },
        ...[...new Set(leads.map((l) => l.userId))].map((userId) => ({ userId, type, link, message })),
      ]);
    }

    successResponse(res, { saved, submitted: submit ? saved : 0 });
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  getProgramTargets,
  createTarget,
  updateTarget,
  removeTarget,
  reviewSubmission,
  getMyTargets,
  saveMySubmissions,
};
