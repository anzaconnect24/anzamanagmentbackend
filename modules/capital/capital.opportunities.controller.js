// Capital opportunities: the pipeline, each opportunity's record, the manager's
// interventions, internal notes, and the outcome that says what was mobilised.
const { Op } = require("sequelize");
const {
  Business,
  BusinessSector,
  CapitalDdItem,
  CapitalDealRoom,
  CapitalDocument,
  CapitalIntervention,
  CapitalIntroduction,
  CapitalMessage,
  CapitalNote,
  CapitalOpportunity,
  CapitalProvider,
  CapitalRequest,
  CapitalThread,
  Log,
  User,
  sequelize,
} = require("../../models");
const { errorResponse, successResponse } = require("../../utils/responses");
const { audit, diff } = require("../../utils/capital_audit");
const { can, CFM_ROLE } = require("../../utils/capital_access");
const { notify, notifyManagers } = require("../../utils/capital_notify");
const { scoreMatch } = require("../../utils/capital_match");
const { createWithReference } = require("../../utils/capital_reference");
const {
  STAGES,
  STAGE_PROBABILITY,
  stageIndex,
  stageMoveErrors,
} = require("../../utils/capital_rules");
const {
  businessInclude,
  dateRange,
  enterpriseProfile,
  ensureThread,
  fail,
  resolveFilterIds,
  shapeBusiness,
  shapeProvider,
  shapeUser,
  syncRequestStatus,
} = require("./capital.shared");

const human = (value) => String(value || "").replace(/_/g, " ");
const statusText = (row) => `${row.stage}/${row.status}`;

// ---- Filtering --------------------------------------------------------------

const opportunityQuery = async (query) => {
  const ids = await resolveFilterIds(query);
  const where = {};

  if (query.status) where.status = query.status;
  if (query.stage) where.stage = query.stage;
  if (query.financingType) where.financingType = query.financingType;
  if (ids.providerId) where.capitalProviderId = ids.providerId;
  if (ids.managerId) where.assignedManagerId = ids.managerId;
  const range = dateRange(query);
  if (range) where.createdAt = range;
  if (query.amountMin || query.amountMax) {
    where.potentialAmount = {};
    if (query.amountMin) where.potentialAmount[Op.gte] = Number(query.amountMin);
    if (query.amountMax) where.potentialAmount[Op.lte] = Number(query.amountMax);
  }

  const requestWhere = {};
  if (ids.cohortProgramId) requestWhere.cohortProgramId = ids.cohortProgramId;

  return {
    where,
    include: [
      businessInclude(query),
      { model: CapitalProvider, attributes: ["id", "uuid", "name", "providerType"], ...(query.providerType ? { where: { providerType: query.providerType }, required: true } : {}) },
      { model: CapitalRequest, attributes: ["id", "uuid", "reference", "amountRequested", "currency", "cohortProgramId", "readinessStatus"], required: Object.keys(requestWhere).length > 0, where: Object.keys(requestWhere).length ? requestWhere : undefined },
      { model: User, as: "assignedManager", attributes: ["uuid", "name"] },
    ],
  };
};

const card = (row) => ({
  uuid: row.uuid,
  reference: row.reference,
  enterprise: shapeBusiness(row.Business),
  provider: row.CapitalProvider ? { uuid: row.CapitalProvider.uuid, name: row.CapitalProvider.name, providerType: row.CapitalProvider.providerType } : null,
  capitalRequest: row.CapitalRequest ? { uuid: row.CapitalRequest.uuid, reference: row.CapitalRequest.reference } : null,
  amountRequested: row.CapitalRequest ? row.CapitalRequest.amountRequested : null,
  potentialAmount: row.potentialAmount,
  currency: row.currency,
  financingType: row.financingType,
  matchScore: row.matchScore,
  probability: row.probability,
  stage: row.stage,
  status: row.status,
  outcome: row.outcome,
  amountCommitted: row.amountCommitted,
  amountDisbursed: row.amountDisbursed,
  lastActivityAt: row.lastActivityAt,
  nextAction: row.nextAction,
  nextActionDate: row.nextActionDate,
  meetingAt: row.meetingAt,
  communicationMode: row.communicationMode,
  communicationPaused: row.communicationPaused,
  escalated: row.escalated,
  flags: row.flags,
  introductionApproved: !!row.introductionApprovedAt,
  assignedManager: row.assignedManager ? { uuid: row.assignedManager.uuid, name: row.assignedManager.name } : null,
});

const listOpportunities = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 50));
    const { where, include } = await opportunityQuery(req.query);

    const { count, rows } = await CapitalOpportunity.findAndCountAll({
      where,
      include,
      order: [["lastActivityAt", "DESC"], ["id", "DESC"]],
      limit,
      offset: (page - 1) * limit,
      distinct: true,
    });

    successResponse(res, { count, page, totalPages: Math.ceil(count / limit), data: rows.map(card) });
  } catch (error) {
    errorResponse(res, error);
  }
};

// The kanban board: every stage, in order, with its cards.
const pipelineBoard = async (req, res) => {
  try {
    const { where, include } = await opportunityQuery(req.query);
    if (!req.query.status) where.status = { [Op.in]: ["active", "won"] };

    const rows = await CapitalOpportunity.findAll({ where, include, order: [["nextActionDate", "ASC"], ["lastActivityAt", "DESC"]] });

    successResponse(res, {
      stages: STAGES.map((stage) => {
        const items = rows.filter((row) => row.stage === stage).map(card);
        return {
          stage,
          count: items.length,
          potentialAmount: items.reduce((sum, item) => sum + Number(item.potentialAmount || 0), 0),
          items,
        };
      }),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const findOpportunity = (uuid, transaction) =>
  CapitalOpportunity.findOne({
    where: { uuid },
    include: [
      { model: Business, include: [{ model: BusinessSector, attributes: ["name"] }] },
      { model: CapitalProvider, include: [{ model: User, as: "account", attributes: ["uuid", "name", "email", "phone"] }] },
      { model: CapitalRequest },
      { model: User, as: "assignedManager", attributes: ["uuid", "name"] },
    ],
    transaction,
  });

// The full Capital Opportunity record.
const getOpportunity = async (req, res) => {
  try {
    const opportunity = await findOpportunity(req.params.uuid);
    if (!opportunity) return fail(res, 404, "Capital opportunity not found");

    const [introductions, threads, dealRoom, ddItems, interventions, notes, trail, evidence] = await Promise.all([
      CapitalIntroduction.findAll({ where: { capitalOpportunityId: opportunity.id }, include: [{ model: User, as: "reviewedBy", attributes: ["uuid", "name"] }], order: [["createdAt", "DESC"]] }),
      CapitalThread.findAll({ where: { capitalOpportunityId: opportunity.id } }),
      CapitalDealRoom.findOne({ where: { capitalOpportunityId: opportunity.id } }),
      CapitalDdItem.findAll({ where: { capitalOpportunityId: opportunity.id }, attributes: ["status", "riskLevel", "dueDate"], raw: true }),
      CapitalIntervention.findAll({ where: { capitalOpportunityId: opportunity.id }, include: [{ model: User, as: "user", attributes: ["uuid", "name"] }], order: [["createdAt", "DESC"]] }),
      (await can(req, "capital.notes.manage"))
        ? CapitalNote.findAll({ where: { subjectType: "opportunity", subjectId: opportunity.id }, include: [{ model: User, as: "author", attributes: ["uuid", "name"] }], order: [["createdAt", "DESC"]] })
        : [],
      (await can(req, "capital.audit.view"))
        ? Log.findAll({ where: { module: "capital", capitalOpportunityId: opportunity.id }, include: [{ model: User, attributes: ["uuid", "name"] }], order: [["createdAt", "DESC"]], limit: 200 })
        : [],
      CapitalDocument.count({ where: { capitalOpportunityId: opportunity.id, deletedAt: null, category: { [Op.in]: ["signed_agreement", "term_sheet", "loan_agreement", "grant_agreement", "commitment_letter", "investor_confirmation", "bank_confirmation", "disbursement_evidence", "investment_agreement"] } } }),
    ]);

    const threadIds = threads.map((thread) => thread.id);
    const messages = threadIds.length
      ? await CapitalMessage.findAll({ where: { capitalThreadId: { [Op.in]: threadIds } }, attributes: ["capitalThreadId", "status"], raw: true })
      : [];

    const today = new Date().toISOString().slice(0, 10);
    const data = opportunity.toJSON();

    successResponse(res, {
      ...card(opportunity),
      matchBreakdown: data.matchBreakdown,
      matchExplanation: data.matchExplanation,
      introductionApprovedAt: data.introductionApprovedAt,
      amountApproved: data.amountApproved,
      dateCommitted: data.dateCommitted,
      dateDisbursed: data.dateDisbursed,
      financingTerms: data.financingTerms,
      capitalSource: data.capitalSource,
      anzaContribution: data.anzaContribution,
      anzaContributionNotes: data.anzaContributionNotes,
      closedAt: data.closedAt,
      closedReason: data.closedReason,
      createdAt: data.createdAt,
      enterprise: shapeBusiness(opportunity.Business, { revealContacts: true }),
      provider: shapeProvider(opportunity.CapitalProvider, { revealContacts: true }),
      capitalRequest: opportunity.CapitalRequest && {
        uuid: opportunity.CapitalRequest.uuid,
        reference: opportunity.CapitalRequest.reference,
        status: opportunity.CapitalRequest.status,
        amountRequested: opportunity.CapitalRequest.amountRequested,
        currency: opportunity.CapitalRequest.currency,
        purpose: opportunity.CapitalRequest.purpose,
        readinessStatus: opportunity.CapitalRequest.readinessStatus,
      },
      // Which stages the card could be dropped on, and why not otherwise.
      stageRules: STAGES.map((stage) => ({ stage, errors: stage === opportunity.stage ? [] : stageMoveErrors(data, stage) })),
      introductions: introductions.map((row) => ({ uuid: row.uuid, initiatedBy: row.initiatedBy, requestType: row.requestType, status: row.status, reviewedBy: row.reviewedBy, reviewNote: row.reviewNote, scheduledAt: row.scheduledAt, createdAt: row.createdAt })),
      threads: threads.map((thread) => {
        const mine = messages.filter((row) => row.capitalThreadId === thread.id);
        return { uuid: thread.uuid, kind: thread.kind, lastMessageAt: thread.lastMessageAt, messages: mine.length, pendingApproval: mine.filter((row) => row.status === "pending_approval").length };
      }),
      dealRoom: dealRoom ? { uuid: dealRoom.uuid, name: dealRoom.name, status: dealRoom.status } : null,
      dueDiligence: {
        total: ddItems.length,
        verified: ddItems.filter((row) => CapitalDdItem.DONE.includes(row.status)).length,
        issues: ddItems.filter((row) => row.status === "issue_identified").length,
        overdue: ddItems.filter((row) => row.dueDate && row.dueDate < today && !CapitalDdItem.DONE.includes(row.status)).length,
        highRisk: ddItems.filter((row) => ["high", "critical"].includes(row.riskLevel)).length,
      },
      interventions: interventions.map((row) => ({ uuid: row.uuid, action: row.action, reason: row.reason, comments: row.comments, previousStatus: row.previousStatus, newStatus: row.newStatus, user: row.user, createdAt: row.createdAt })),
      notes: notes.map((note) => ({ uuid: note.uuid, body: note.body, author: note.author, createdAt: note.createdAt })),
      evidenceDocuments: evidence,
      auditTrail: trail.map((row) => ({ action: row.action, user: row.User, role: row.role, oldValue: row.oldValue, newValue: row.newValue, ipAddress: row.ipAddress, createdAt: row.createdAt })),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// ---- Editing and moving -----------------------------------------------------

const updateOpportunity = async (req, res) => {
  try {
    const opportunity = await findOpportunity(req.params.uuid);
    if (!opportunity) return fail(res, 404, "Capital opportunity not found");

    const { probability, potentialAmount, nextAction, nextActionDate, managerUuid, meetingAt } = req.body;
    const values = {};

    if (probability !== undefined) {
      const value = Number(probability);
      if (!Number.isInteger(value) || value < 0 || value > 100) return fail(res, 400, "Probability must be a whole number from 0 to 100");
      values.probability = value;
    }
    if (potentialAmount !== undefined) {
      if (potentialAmount !== null && (!Number.isFinite(Number(potentialAmount)) || Number(potentialAmount) < 0)) return fail(res, 400, "Potential financing must be a non-negative number");
      values.potentialAmount = potentialAmount === null ? null : Number(potentialAmount);
    }
    if (nextAction !== undefined) values.nextAction = nextAction ? String(nextAction).slice(0, 255) : null;
    if (nextActionDate !== undefined) values.nextActionDate = nextActionDate || null;
    if (meetingAt !== undefined) {
      if (meetingAt && Number.isNaN(new Date(meetingAt).getTime())) return fail(res, 400, "Meeting date is not a valid date");
      values.meetingAt = meetingAt ? new Date(meetingAt) : null;
    }

    let manager = null;
    if (managerUuid !== undefined) {
      manager = await User.findOne({ where: { uuid: managerUuid, role: CFM_ROLE, activated: true }, attributes: ["id", "name"] });
      if (!manager) return fail(res, 400, "Assign an active Capital Facilitation Manager");
      values.assignedManagerId = manager.id;
    }

    if (!Object.keys(values).length) return fail(res, 400, "Nothing to update");

    const before = opportunity.toJSON();
    await opportunity.update({ ...values, lastActivityAt: new Date() });
    const change = diff(before, values);

    if (change.changed) {
      await audit(req, {
        action: `Updated ${opportunity.reference}${manager ? ` and assigned it to ${manager.name}` : ""}`,
        actionKey: manager ? "opportunity.assigned" : "opportunity.updated",
        entity: { type: "capital_opportunity", id: opportunity.id, uuid: opportunity.uuid },
        opportunity,
        oldValue: change.oldValue,
        newValue: change.newValue,
      });
    }

    if (manager && manager.id !== req.user.id) {
      await notify({ userIds: [manager.id], type: "capital.opportunity.assigned", message: `${opportunity.reference} (${opportunity.Business.name} / ${opportunity.CapitalProvider.name}) was assigned to you`, link: `/dashboard/capital/opportunities/${opportunity.uuid}` });
    }

    successResponse(res, card(opportunity));
  } catch (error) {
    errorResponse(res, error);
  }
};

const readAmounts = (body) => {
  const values = {};
  for (const key of ["amountCommitted", "amountDisbursed", "amountApproved"]) {
    if (body[key] === undefined || body[key] === "") continue;
    if (!Number.isFinite(Number(body[key])) || Number(body[key]) < 0) return { error: `${human(key)} must be a non-negative number` };
    values[key] = Number(body[key]);
  }
  for (const key of ["dateCommitted", "dateDisbursed"]) if (body[key]) values[key] = body[key];
  if (values.amountDisbursed !== undefined && values.amountCommitted !== undefined && values.amountDisbursed > values.amountCommitted) {
    return { error: "The amount disbursed cannot exceed the amount committed" };
  }
  return { values };
};

// Drag-and-drop on the pipeline, and every other stage change.
const moveStage = async (req, res) => {
  try {
    const opportunity = await findOpportunity(req.params.uuid);
    if (!opportunity) return fail(res, 404, "Capital opportunity not found");

    const target = req.body.stage;
    if (target === opportunity.stage) return fail(res, 400, "The opportunity is already at that stage");

    const { values: amounts, error } = readAmounts(req.body);
    if (error) return fail(res, 400, error);

    const errors = stageMoveErrors(opportunity.toJSON(), target, amounts);
    if (errors.length) return res.status(422).json({ status: false, message: errors[0], errors });

    const before = { stage: opportunity.stage, probability: opportunity.probability, amountCommitted: opportunity.amountCommitted, amountDisbursed: opportunity.amountDisbursed };
    const forward = stageIndex(target) > stageIndex(opportunity.stage);
    const values = {
      ...amounts,
      stage: target,
      lastActivityAt: new Date(),
      probability: forward ? Math.max(opportunity.probability || 0, STAGE_PROBABILITY[target]) : STAGE_PROBABILITY[target],
    };

    await opportunity.update(values);

    await audit(req, {
      action: `Moved ${opportunity.reference} from ${human(before.stage)} to ${human(target)}`,
      actionKey: "opportunity.stage_changed",
      entity: { type: "capital_opportunity", id: opportunity.id, uuid: opportunity.uuid },
      opportunity,
      oldValue: before,
      newValue: { stage: target, probability: values.probability, amountCommitted: opportunity.amountCommitted, amountDisbursed: opportunity.amountDisbursed },
      details: req.body.reason ? { reason: req.body.reason } : undefined,
    }, { strict: true });

    await syncRequestStatus(req, opportunity.capitalRequestId);

    // The milestones people are waiting to hear about.
    const enterpriseUser = opportunity.Business.userId;
    const link = `/dashboard/capital/opportunities/${opportunity.uuid}`;
    const events = {
      term_sheet: ["capital.offer.received", `A financing offer was received from ${opportunity.CapitalProvider.name} on ${opportunity.reference}`],
      commitment: ["capital.commitment.confirmed", `Commitment confirmed: ${opportunity.currency} ${Number(opportunity.amountCommitted).toLocaleString()} from ${opportunity.CapitalProvider.name} (${opportunity.reference})`],
      disbursement: ["capital.disbursement.started", `Disbursement under way on ${opportunity.reference}`],
      capital_secured: ["capital.secured", `Capital secured on ${opportunity.reference}`],
      post_financing: ["capital.disbursed", `Capital disbursed: ${opportunity.currency} ${Number(opportunity.amountDisbursed || 0).toLocaleString()} on ${opportunity.reference}`],
    };
    if (forward && events[target]) {
      const [type, message] = events[target];
      await notifyManagers({ managerId: opportunity.assignedManagerId, type, message, link });
      if (enterpriseUser) await notify({ userIds: [enterpriseUser], type, message, link: "/dashboard/capital" });
    }

    successResponse(res, card(opportunity));
  } catch (error) {
    errorResponse(res, error);
  }
};

// Moderated -> monitored -> direct, set by the manager as the relationship
// matures. Anything but moderated needs an approved introduction first.
const setCommunicationMode = async (req, res) => {
  try {
    const { mode, reason } = req.body;
    if (!CapitalOpportunity.MODES.includes(mode)) return fail(res, 400, `Mode must be one of ${CapitalOpportunity.MODES.join(", ")}`);
    if (!String(reason || "").trim()) return fail(res, 400, "Give a reason for changing how the parties communicate");

    const opportunity = await findOpportunity(req.params.uuid);
    if (!opportunity) return fail(res, 404, "Capital opportunity not found");
    if (mode !== "moderated" && !opportunity.introductionApprovedAt) return fail(res, 409, "Approve the introduction before letting the parties talk without moderation");

    const before = { communicationMode: opportunity.communicationMode, communicationPaused: opportunity.communicationPaused };
    await opportunity.update({ communicationMode: mode, communicationPaused: false, lastActivityAt: new Date() });

    await CapitalIntervention.create({
      capitalOpportunityId: opportunity.id,
      action: "change_communication_mode",
      reason: String(reason).trim(),
      previousStatus: `${before.communicationMode}${before.communicationPaused ? " (paused)" : ""}`,
      newStatus: mode,
      userId: req.user.id,
    });

    await audit(req, {
      action: `Changed communication on ${opportunity.reference} to ${mode}`,
      actionKey: "communication.mode_changed",
      entity: { type: "capital_opportunity", id: opportunity.id, uuid: opportunity.uuid },
      opportunity,
      oldValue: before,
      newValue: { communicationMode: mode, communicationPaused: false },
      details: { reason },
    }, { strict: true });

    successResponse(res, card(opportunity));
  } catch (error) {
    errorResponse(res, error);
  }
};

// ---- Interventions ----------------------------------------------------------

const postManagerMessage = async (req, opportunity, kind, body, transaction) => {
  const thread = await ensureThread(opportunity.id, kind, transaction);
  await CapitalMessage.create({ capitalThreadId: thread.id, senderId: req.user.id, senderRole: req.user.role, body, status: "delivered", isIntervention: true }, { transaction });
  await thread.update({ lastMessageAt: new Date() }, { transaction });
};

const intervene = async (req, res) => {
  const transaction = await sequelize.transaction();
  const refuse = async (code, message) => {
    await transaction.rollback();
    return fail(res, code, message);
  };

  try {
    const { action, reason, comments, providerUuid, meetingAt, outcome } = req.body;
    if (!CapitalIntervention.ACTIONS.includes(action)) return refuse(400, `Intervention must be one of ${CapitalIntervention.ACTIONS.join(", ")}`);
    if (!String(reason || "").trim()) return refuse(400, "Every intervention needs a reason");

    const opportunity = await findOpportunity(req.params.uuid, transaction);
    if (!opportunity) return refuse(404, "Capital opportunity not found");
    if (opportunity.status !== "active") return refuse(409, "Interventions apply to active opportunities");

    const previous = statusText(opportunity);
    const values = { lastActivityAt: new Date() };
    const text = String(reason).trim();
    let replacement = null;

    switch (action) {
      case "request_enterprise_clarification":
        values.nextAction = "Awaiting the enterprise's clarification";
        await postManagerMessage(req, opportunity, "enterprise_manager", `Anza needs clarification: ${text}`, transaction);
        break;
      case "request_provider_clarification":
        values.nextAction = "Awaiting the capital provider's clarification";
        await postManagerMessage(req, opportunity, "provider_manager", `Anza needs clarification: ${text}`, transaction);
        break;
      case "request_updated_documents":
        values.nextAction = "Awaiting updated documents from the enterprise";
        await postManagerMessage(req, opportunity, "enterprise_manager", `Please upload updated documents: ${text}`, transaction);
        break;
      case "stop_introduction":
        Object.assign(values, { introductionApprovedAt: null, communicationPaused: true, communicationMode: "moderated", stage: stageIndex(opportunity.stage) > stageIndex("introduction") ? "matching" : opportunity.stage });
        await CapitalIntroduction.update({ status: "declined", reviewNote: `Stopped by Anza: ${text}`, reviewedById: req.user.id, reviewedAt: new Date() }, { where: { capitalOpportunityId: opportunity.id, status: { [Op.in]: ["approved", "scheduled"] } }, transaction });
        break;
      case "pause_communication":
        values.communicationPaused = true;
        break;
      case "schedule_meeting": {
        const when = new Date(meetingAt);
        if (!meetingAt || Number.isNaN(when.getTime())) return refuse(400, "Give the meeting date and time");
        Object.assign(values, { meetingAt: when, nextAction: "Hold the scheduled meeting", nextActionDate: when.toISOString().slice(0, 10) });
        break;
      }
      case "escalate":
        values.escalated = true;
        break;
      case "flag_compliance_concern":
      case "flag_financing_risk":
      case "flag_documentation_issue":
        values.flags = [...(opportunity.flags || []), { type: action.replace("flag_", ""), reason: text, at: new Date().toISOString(), by: req.user.id }];
        break;
      case "recommend_additional_providers":
        values.nextAction = "Review additional recommended capital providers";
        break;
      case "close_opportunity":
        Object.assign(values, { status: "closed", closedAt: new Date(), closedReason: text, outcome: CapitalOpportunity.OUTCOMES.includes(outcome) ? outcome : "other", probability: 0 });
        break;
      case "change_provider": {
        const provider = await CapitalProvider.findOne({ where: { uuid: providerUuid, status: "active" }, transaction });
        if (!provider) return refuse(404, "Choose an active capital provider");
        if (provider.id === opportunity.capitalProviderId) return refuse(400, "Choose a different capital provider");
        const exists = await CapitalOpportunity.findOne({ where: { capitalRequestId: opportunity.capitalRequestId, capitalProviderId: provider.id }, transaction });
        if (exists) return refuse(409, `${provider.name} is already ${exists.reference} on this request`);
        const result = scoreMatch({ enterprise: enterpriseProfile(opportunity.Business, opportunity.CapitalRequest), request: opportunity.CapitalRequest, provider: provider.toJSON() });
        replacement = await createWithReference(CapitalOpportunity, "CAP", {
          capitalRequestId: opportunity.capitalRequestId,
          capitalProviderId: provider.id,
          businessId: opportunity.businessId,
          stage: "matching",
          probability: STAGE_PROBABILITY.matching,
          matchScore: result.score,
          matchBreakdown: result.breakdown,
          matchExplanation: result.explanation,
          potentialAmount: opportunity.potentialAmount,
          currency: opportunity.currency,
          financingType: opportunity.financingType,
          assignedManagerId: opportunity.assignedManagerId,
          lastActivityAt: new Date(),
          nextAction: `Replaces ${opportunity.reference}: decide on introduction`,
        }, { transaction });
        Object.assign(values, { status: "closed", closedAt: new Date(), closedReason: `Replaced by ${replacement.reference} (${provider.name}): ${text}`, outcome: "other", probability: 0 });
        break;
      }
      default:
        break;
    }

    await opportunity.update(values, { transaction });

    const newStatus = statusText(opportunity);
    const intervention = await CapitalIntervention.create({
      capitalOpportunityId: opportunity.id,
      action,
      reason: text,
      comments: comments || null,
      previousStatus: previous,
      newStatus,
      userId: req.user.id,
    }, { transaction });

    await transaction.commit();

    await audit(req, {
      action: `Intervened on ${opportunity.reference}: ${human(action)}`,
      actionKey: `intervention.${action}`,
      entity: { type: "capital_intervention", id: intervention.id, uuid: intervention.uuid },
      opportunity,
      oldValue: { status: previous },
      newValue: { status: newStatus, ...(replacement ? { replacement: replacement.reference } : {}) },
      details: { reason: text, comments },
    }, { strict: true });

    await syncRequestStatus(req, opportunity.capitalRequestId);

    const enterpriseUser = opportunity.Business.userId;
    const providerUser = opportunity.CapitalProvider.userId;
    if (["request_enterprise_clarification", "request_updated_documents"].includes(action) && enterpriseUser) {
      await notify({ userIds: [enterpriseUser], type: `capital.intervention.${action}`, message: `Anza needs something from you on ${opportunity.reference}`, link: "/dashboard/capital" });
    }
    if (action === "request_provider_clarification" && providerUser) {
      await notify({ userIds: [providerUser], type: `capital.intervention.${action}`, message: `Anza needs clarification on ${opportunity.reference}`, link: "/dashboard/capital-deals" });
    }
    if (action === "schedule_meeting") {
      const at = values.meetingAt.toLocaleString("en-GB");
      if (enterpriseUser) await notify({ userIds: [enterpriseUser], type: "capital.meeting.scheduled", message: `Meeting on ${opportunity.reference} scheduled for ${at}`, link: "/dashboard/capital" });
      if (providerUser) await notify({ userIds: [providerUser], type: "capital.meeting.scheduled", message: `Meeting on ${opportunity.reference} scheduled for ${at}`, link: "/dashboard/capital-deals" });
    }
    if (action === "escalate") {
      await notifyManagers({ type: "capital.opportunity.escalated", message: `${opportunity.reference} was escalated: ${text.slice(0, 120)}`, link: `/dashboard/capital/opportunities/${opportunity.uuid}` });
    }

    successResponse(res, { ...card(opportunity), replacement: replacement ? { uuid: replacement.uuid, reference: replacement.reference } : null });
  } catch (error) {
    await transaction.rollback();
    errorResponse(res, error);
  }
};

const reopenOpportunity = async (req, res) => {
  try {
    if (!String(req.body.reason || "").trim()) return fail(res, 400, "Give a reason for reopening");
    const opportunity = await findOpportunity(req.params.uuid);
    if (!opportunity) return fail(res, 404, "Capital opportunity not found");
    if (opportunity.status === "active") return fail(res, 409, "This opportunity is already active");

    const before = { status: opportunity.status, outcome: opportunity.outcome, closedAt: opportunity.closedAt };
    await opportunity.update({ status: "active", outcome: null, closedAt: null, closedReason: null, lastActivityAt: new Date(), probability: STAGE_PROBABILITY[opportunity.stage] });

    await audit(req, {
      action: `Reopened ${opportunity.reference}`,
      actionKey: "opportunity.reopened",
      entity: { type: "capital_opportunity", id: opportunity.id, uuid: opportunity.uuid },
      opportunity,
      oldValue: before,
      newValue: { status: "active", outcome: null },
      details: { reason: req.body.reason },
    }, { strict: true });

    await syncRequestStatus(req, opportunity.capitalRequestId);
    successResponse(res, card(opportunity));
  } catch (error) {
    errorResponse(res, error);
  }
};

// ---- Outcome and Anza's contribution ---------------------------------------

const recordOutcome = async (req, res) => {
  try {
    const opportunity = await findOpportunity(req.params.uuid);
    if (!opportunity) return fail(res, 404, "Capital opportunity not found");

    const { outcome, financingTerms, capitalSource, anzaContributionNotes, financingType } = req.body;
    if (!CapitalOpportunity.OUTCOMES.includes(outcome)) return fail(res, 400, `Outcome must be one of ${CapitalOpportunity.OUTCOMES.join(", ")}`);

    const { values: amounts, error } = readAmounts(req.body);
    if (error) return fail(res, 400, error);

    const contribution = (Array.isArray(req.body.anzaContribution) ? req.body.anzaContribution : []).filter((item) => CapitalOpportunity.CONTRIBUTIONS.includes(item));
    const success = CapitalOpportunity.SUCCESS.includes(outcome);
    const merged = { ...opportunity.toJSON(), ...amounts };

    if (success) {
      if (!(Number(merged.amountCommitted) > 0)) return fail(res, 400, "Record the amount committed for a successful outcome");
      if (!merged.dateCommitted) return fail(res, 400, "Record the date the capital was committed");
      if (!contribution.length) return fail(res, 400, "Record at least one way Anza contributed to this financing");
      if (Number(merged.amountDisbursed) > Number(merged.amountCommitted)) return fail(res, 400, "The amount disbursed cannot exceed the amount committed");
      if (merged.amountDisbursed > 0 && !merged.dateDisbursed) return fail(res, 400, "Record the date the capital was disbursed");
    }
    if (financingType !== undefined && !CapitalRequest.FINANCING_TYPES.includes(financingType)) {
      return fail(res, 400, `Type of financing must be one of ${CapitalRequest.FINANCING_TYPES.join(", ")}`);
    }

    const values = {
      ...amounts,
      outcome,
      financingTerms: financingTerms !== undefined ? financingTerms : opportunity.financingTerms,
      capitalSource: capitalSource !== undefined ? capitalSource : opportunity.capitalSource,
      anzaContribution: contribution.length ? contribution : opportunity.anzaContribution,
      anzaContributionNotes: anzaContributionNotes !== undefined ? anzaContributionNotes : opportunity.anzaContributionNotes,
      status: success ? "won" : "lost",
      closedAt: new Date(),
      lastActivityAt: new Date(),
      probability: success ? 100 : 0,
    };
    if (financingType) values.financingType = financingType;
    if (success) values.stage = Number(merged.amountDisbursed) > 0 ? "post_financing" : "capital_secured";

    const before = opportunity.toJSON();
    await opportunity.update(values);
    const change = diff(before, values);

    await audit(req, {
      action: `Recorded outcome on ${opportunity.reference}: ${human(outcome)}`,
      actionKey: "opportunity.outcome_recorded",
      entity: { type: "capital_opportunity", id: opportunity.id, uuid: opportunity.uuid },
      opportunity,
      oldValue: change.oldValue,
      newValue: change.newValue,
    }, { strict: true });

    await syncRequestStatus(req, opportunity.capitalRequestId);

    const link = `/dashboard/capital/opportunities/${opportunity.uuid}`;
    if (success) {
      await notifyManagers({ managerId: opportunity.assignedManagerId, type: "capital.commitment.confirmed", message: `Capital secured on ${opportunity.reference}: ${opportunity.currency} ${Number(opportunity.amountCommitted).toLocaleString()}`, link });
      if (Number(opportunity.amountDisbursed) > 0) {
        await notifyManagers({ managerId: opportunity.assignedManagerId, type: "capital.disbursed", message: `Capital disbursed on ${opportunity.reference}: ${opportunity.currency} ${Number(opportunity.amountDisbursed).toLocaleString()}`, link });
      }
    }
    if (opportunity.Business.userId) {
      await notify({ userIds: [opportunity.Business.userId], type: "capital.outcome.recorded", message: `Outcome recorded on ${opportunity.reference}: ${human(outcome)}`, link: "/dashboard/capital" });
    }

    successResponse(res, card(opportunity));
  } catch (error) {
    errorResponse(res, error);
  }
};

// ---- Internal notes ---------------------------------------------------------

const SUBJECT_MODELS = {
  request: CapitalRequest,
  opportunity: CapitalOpportunity,
  provider: CapitalProvider,
  enterprise: Business,
};

const subjectFor = async (type, uuid) => {
  const Model = SUBJECT_MODELS[type];
  return Model ? Model.findOne({ where: { uuid }, attributes: ["id", "uuid"] }) : null;
};

const listNotes = async (req, res) => {
  try {
    const subject = await subjectFor(req.params.type, req.params.uuid);
    if (!subject) return fail(res, 404, "Record not found");

    const notes = await CapitalNote.findAll({
      where: { subjectType: req.params.type, subjectId: subject.id },
      include: [{ model: User, as: "author", attributes: ["uuid", "name"] }],
      order: [["createdAt", "DESC"]],
    });
    successResponse(res, { data: notes.map((note) => ({ uuid: note.uuid, body: note.body, author: shapeUser(note.author), createdAt: note.createdAt })) });
  } catch (error) {
    errorResponse(res, error);
  }
};

const addNote = async (req, res) => {
  try {
    const body = String(req.body.body || "").trim();
    if (!body) return fail(res, 400, "Write the note");

    const subject = await subjectFor(req.params.type, req.params.uuid);
    if (!subject) return fail(res, 404, "Record not found");

    const note = await CapitalNote.create({ subjectType: req.params.type, subjectId: subject.id, body, authorId: req.user.id });

    // The audit trail records that a note was written, not what it says.
    await audit(req, {
      action: `Added an internal note to ${req.params.type} ${subject.uuid}`,
      actionKey: "note.added",
      entity: { type: "capital_note", id: note.id, uuid: note.uuid },
      opportunityId: req.params.type === "opportunity" ? subject.id : null,
      providerId: req.params.type === "provider" ? subject.id : null,
      businessId: req.params.type === "enterprise" ? subject.id : null,
    });

    successResponse(res, { uuid: note.uuid, body: note.body, createdAt: note.createdAt });
  } catch (error) {
    errorResponse(res, error);
  }
};

// ---- The parties' own view ----------------------------------------------------

// An enterprise's or capital provider's opportunities. Each side sees an
// opportunity only once Anza has approved the introduction - before that it is
// the manager's working, not a relationship - and never the manager's match
// score, probability, flags or notes.
const myOpportunities = async (req, res) => {
  try {
    const where = { introductionApprovedAt: { [Op.ne]: null } };
    let side;

    if (req.user.role === "Enterprenuer") {
      const business = await Business.findOne({ where: { userId: req.user.id }, attributes: ["id"] });
      if (!business) return successResponse(res, { data: [] });
      where.businessId = business.id;
      side = "enterprise";
    } else if (req.user.role === "Investor") {
      const provider = await CapitalProvider.findOne({ where: { userId: req.user.id }, attributes: ["id"] });
      if (!provider) return successResponse(res, { data: [] });
      where.capitalProviderId = provider.id;
      side = "provider";
    } else {
      return fail(res, 403, "Only an enterprise or a capital provider has its own opportunities");
    }

    const rows = await CapitalOpportunity.findAll({
      where,
      include: [
        { model: Business, include: [{ model: BusinessSector, attributes: ["name"] }] },
        { model: CapitalProvider },
        { model: CapitalRequest, attributes: ["uuid", "reference", "amountRequested", "currency"] },
        { model: CapitalDealRoom, as: "dealRoom", attributes: ["uuid", "name", "status"] },
      ],
      order: [["lastActivityAt", "DESC"], ["id", "DESC"]],
    });

    successResponse(res, {
      side,
      data: rows.map((row) => ({
        uuid: row.uuid,
        reference: row.reference,
        stage: row.stage,
        status: row.status,
        outcome: row.outcome,
        financingType: row.financingType,
        currency: row.currency,
        potentialAmount: row.potentialAmount,
        amountCommitted: row.amountCommitted,
        amountDisbursed: row.amountDisbursed,
        communicationMode: row.communicationMode,
        communicationPaused: row.communicationPaused,
        meetingAt: row.meetingAt,
        lastActivityAt: row.lastActivityAt,
        capitalRequest: side === "enterprise" && row.CapitalRequest ? { uuid: row.CapitalRequest.uuid, reference: row.CapitalRequest.reference, amountRequested: row.CapitalRequest.amountRequested, currency: row.CapitalRequest.currency } : null,
        dealRoom: row.dealRoom ? { uuid: row.dealRoom.uuid, name: row.dealRoom.name, status: row.dealRoom.status } : null,
        // The introduction is approved, so the counterpart's contacts are theirs.
        counterpart: side === "enterprise"
          ? { kind: "provider", ...shapeProvider(row.CapitalProvider, { revealContacts: true }) }
          : { kind: "enterprise", ...shapeBusiness(row.Business, { revealContacts: true }) },
      })),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  myOpportunities,
  opportunityQuery,
  card,
  listOpportunities,
  pipelineBoard,
  getOpportunity,
  updateOpportunity,
  moveStage,
  setCommunicationMode,
  intervene,
  reopenOpportunity,
  recordOutcome,
  listNotes,
  addNote,
};
