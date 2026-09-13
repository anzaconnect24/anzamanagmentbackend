// Controlled introductions. Contact between an enterprise and a capital
// provider starts as a request that the Capital Facilitation Manager approves,
// edits, redirects or declines - whichever side asked first.
const { Op } = require("sequelize");
const {
  Business,
  BusinessSector,
  CapitalDocument,
  CapitalIntroduction,
  CapitalOpportunity,
  CapitalProvider,
  CapitalRequest,
  User,
  sequelize,
} = require("../../models");
const { errorResponse, successResponse } = require("../../utils/responses");
const { audit } = require("../../utils/capital_audit");
const { notify, notifyManagers } = require("../../utils/capital_notify");
const { scoreMatch } = require("../../utils/capital_match");
const { createWithReference } = require("../../utils/capital_reference");
const { STAGE_PROBABILITY, stageIndex } = require("../../utils/capital_rules");
const {
  enterpriseProfile,
  ensureThread,
  fail,
  myBusiness,
  myProvider,
  shapeBusiness,
  shapeProvider,
  syncRequestStatus,
} = require("./capital.shared");
const { MATCHABLE } = require("./capital.matching.controller");

// Requests a provider makes for an enterprise's own information. None of these
// is released on the manager's word alone: the enterprise must agree first.
const NEEDS_ENTERPRISE_PERMISSION = [
  "pitch_deck",
  "financial_information",
  "due_diligence_documents",
  "business_plan",
  "financial_model",
  "additional_information",
];

const withBusiness = { model: Business, include: [{ model: BusinessSector, attributes: ["name"] }] };

// ---- Shared creation paths (also used by the legacy investment hooks) ------

// An enterprise's most recent live capital request, if it has one.
const liveRequestFor = (businessId, transaction) =>
  CapitalRequest.findOne({
    where: { businessId, status: { [Op.notIn]: ["draft", "declined", "closed"] } },
    order: [["createdAt", "DESC"]],
    transaction,
  });

/**
 * A capital provider's interest in an enterprise, placed in the manager's
 * queue. Returns { introduction } or { error, code }.
 */
const createProviderInterest = async ({ req, provider, business, requestType = "introduction", message = null, legacyInterestId = null, transaction }) => {
  if (!CapitalIntroduction.REQUEST_TYPES.includes(requestType)) {
    return { code: 400, error: `Request type must be one of ${CapitalIntroduction.REQUEST_TYPES.join(", ")}` };
  }

  const open = await CapitalIntroduction.findOne({
    where: { businessId: business.id, capitalProviderId: provider.id, requestType, status: { [Op.in]: CapitalIntroduction.OPEN } },
    transaction,
  });
  if (open) return { code: 409, error: "A request like this is already waiting for Anza's review" };

  const request = await liveRequestFor(business.id, transaction);

  const introduction = await CapitalIntroduction.create({
    capitalRequestId: request ? request.id : null,
    businessId: business.id,
    capitalProviderId: provider.id,
    initiatedBy: "provider",
    requestedById: req.user.id,
    requestType,
    message,
    status: "pending_review",
    legacyInterestId,
  }, { transaction });

  return { introduction, request };
};

// ---- Manager: the review queue --------------------------------------------

const shapeIntroduction = (row, extra = {}) => ({
  uuid: row.uuid,
  initiatedBy: row.initiatedBy,
  requestType: row.requestType,
  status: row.status,
  message: row.message,
  editedMessage: row.editedMessage,
  enterprisePermission: row.enterprisePermission,
  reviewNote: row.reviewNote,
  scheduledAt: row.scheduledAt,
  createdAt: row.createdAt,
  reviewedAt: row.reviewedAt,
  ...extra,
});

const listIntroductions = async (req, res) => {
  try {
    const where = {};
    if (req.query.status === "all") {
      // everything
    } else if (req.query.status) where.status = req.query.status;
    else where.status = { [Op.in]: CapitalIntroduction.OPEN };
    if (req.query.initiatedBy) where.initiatedBy = req.query.initiatedBy;

    const rows = await CapitalIntroduction.findAll({
      where,
      include: [
        withBusiness,
        { model: CapitalProvider },
        { model: CapitalRequest },
        { model: CapitalOpportunity, attributes: ["uuid", "reference", "matchScore", "stage", "status"] },
        { model: User, as: "requestedBy", attributes: ["uuid", "name", "role"] },
        { model: User, as: "reviewedBy", attributes: ["uuid", "name"] },
      ],
      order: [["createdAt", "DESC"]],
      limit: Math.min(500, Number(req.query.limit) || 200),
    });

    const requestIds = [...new Set(rows.map((row) => row.capitalRequestId).filter(Boolean))];
    const documents = requestIds.length
      ? await CapitalDocument.findAll({ where: { capitalRequestId: { [Op.in]: requestIds }, deletedAt: null }, attributes: ["capitalRequestId", "uuid", "title", "category"], raw: true })
      : [];

    successResponse(res, {
      count: rows.length,
      data: rows.map((row) => {
        const request = row.CapitalRequest;
        const score = row.CapitalOpportunity
          ? row.CapitalOpportunity.matchScore
          : request
            ? scoreMatch({ enterprise: enterpriseProfile(row.Business, request), request, provider: row.CapitalProvider.toJSON() }).score
            : null;

        return shapeIntroduction(row, {
          enterprise: shapeBusiness(row.Business),
          provider: shapeProvider(row.CapitalProvider, { revealContacts: true }),
          capitalRequest: request && {
            uuid: request.uuid,
            reference: request.reference,
            amountRequested: request.amountRequested,
            currency: request.currency,
            financingType: request.financingType,
            readinessStatus: request.readinessStatus,
            purpose: request.purpose,
          },
          documents: documents.filter((doc) => doc.capitalRequestId === row.capitalRequestId).map(({ uuid, title, category }) => ({ uuid, title, category })),
          opportunity: row.CapitalOpportunity,
          matchScore: score,
          requestedBy: row.requestedBy,
          reviewedBy: row.reviewedBy,
        });
      }),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Find or open the opportunity an approved introduction belongs to. A
// provider-initiated introduction to an enterprise with no capital request
// opens one on its behalf, so every opportunity still hangs off a request.
const opportunityFor = async (req, introduction, transaction) => {
  let request = introduction.capitalRequestId
    ? await CapitalRequest.findByPk(introduction.capitalRequestId, { transaction })
    : await liveRequestFor(introduction.businessId, transaction);

  if (!request) {
    request = await createWithReference(CapitalRequest, "CR", {
      businessId: introduction.businessId,
      userId: introduction.Business.userId,
      financingType: "other",
      currency: "USD",
      purpose: `Opened by Anza from ${introduction.CapitalProvider.name}'s interest in the enterprise`,
      status: "approved_for_matching",
      submittedAt: new Date(),
      reviewedAt: new Date(),
      reviewedById: req.user.id,
      assignedManagerId: req.user.id,
    }, { transaction });
  }

  let opportunity = await CapitalOpportunity.findOne({
    where: { capitalRequestId: request.id, capitalProviderId: introduction.capitalProviderId },
    transaction,
  });

  const stage = introduction.initiatedBy === "provider" ? "provider_interest" : "introduction";

  if (!opportunity) {
    const result = scoreMatch({ enterprise: enterpriseProfile(introduction.Business, request), request, provider: introduction.CapitalProvider.toJSON() });
    opportunity = await createWithReference(CapitalOpportunity, "CAP", {
      capitalRequestId: request.id,
      capitalProviderId: introduction.capitalProviderId,
      businessId: introduction.businessId,
      stage,
      probability: STAGE_PROBABILITY[stage],
      matchScore: result.score,
      matchBreakdown: result.breakdown,
      matchExplanation: result.explanation,
      potentialAmount: request.amountRequested,
      currency: request.currency,
      financingType: request.financingType,
      assignedManagerId: request.assignedManagerId || req.user.id,
      introductionApprovedAt: new Date(),
      lastActivityAt: new Date(),
      nextAction: "Arrange an initial meeting",
    }, { transaction });
  } else {
    const values = { introductionApprovedAt: opportunity.introductionApprovedAt || new Date(), lastActivityAt: new Date() };
    if (stageIndex(stage) > stageIndex(opportunity.stage)) {
      values.stage = stage;
      values.probability = Math.max(opportunity.probability || 0, STAGE_PROBABILITY[stage]);
    }
    await opportunity.update(values, { transaction });
  }

  return { request, opportunity };
};

const REVIEW = ["approve", "edit", "request_changes", "request_clarification", "decline", "replace_provider", "schedule", "request_enterprise_permission", "provide_information"];

const reviewIntroduction = async (req, res) => {
  const transaction = await sequelize.transaction();
  const refuse = async (code, message) => {
    await transaction.rollback();
    return fail(res, code, message);
  };

  try {
    const { action, note, editedMessage, providerUuid, scheduledAt } = req.body;
    if (!REVIEW.includes(action)) return refuse(400, `Action must be one of ${REVIEW.join(", ")}`);

    const introduction = await CapitalIntroduction.findOne({
      where: { uuid: req.params.uuid },
      include: [withBusiness, { model: CapitalProvider }],
      transaction,
    });
    if (!introduction) return refuse(404, "Introduction not found");

    const before = { status: introduction.status, editedMessage: introduction.editedMessage, capitalProviderId: introduction.capitalProviderId };
    const values = { reviewedById: req.user.id, reviewedAt: new Date() };
    let opportunity = null;
    let replacement = null;
    const closed = ["approved", "declined", "replaced", "permission_denied"].includes(introduction.status);

    if (["approve", "decline", "replace_provider", "request_changes", "request_clarification", "request_enterprise_permission", "provide_information"].includes(action) && closed && action !== "schedule") {
      return refuse(409, `This introduction is already ${introduction.status.replace(/_/g, " ")}`);
    }
    if (["decline", "request_changes", "request_clarification"].includes(action) && !String(note || "").trim()) {
      return refuse(400, "Give a reason the requester will see");
    }

    const needsPermission = introduction.initiatedBy === "provider" && NEEDS_ENTERPRISE_PERMISSION.includes(introduction.requestType);

    switch (action) {
      case "edit":
        if (!String(editedMessage || "").trim()) return refuse(400, "Write the edited message");
        values.editedMessage = String(editedMessage).trim();
        break;

      case "request_changes":
        Object.assign(values, { status: "changes_requested", reviewNote: note });
        break;

      case "request_clarification":
        Object.assign(values, { status: "clarification_requested", reviewNote: note });
        break;

      case "decline":
        Object.assign(values, { status: "declined", reviewNote: note });
        break;

      case "request_enterprise_permission":
        if (introduction.initiatedBy !== "provider") return refuse(409, "Only a provider's request needs the enterprise's permission");
        Object.assign(values, { status: "awaiting_enterprise_permission", enterprisePermission: "pending", reviewNote: note || null });
        break;

      case "approve":
      case "provide_information": {
        if (needsPermission && introduction.enterprisePermission !== "granted") {
          return refuse(409, "The enterprise has not agreed to share this information. Request its permission first.");
        }
        if (editedMessage !== undefined && String(editedMessage).trim()) values.editedMessage = String(editedMessage).trim();
        ({ opportunity } = await opportunityFor(req, introduction, transaction));
        Object.assign(values, { status: "approved", capitalOpportunityId: opportunity.id, reviewNote: note || null });
        await ensureThread(opportunity.id, "enterprise_provider", transaction);
        await ensureThread(opportunity.id, "enterprise_manager", transaction);
        await ensureThread(opportunity.id, "provider_manager", transaction);
        break;
      }

      case "replace_provider": {
        const provider = await CapitalProvider.findOne({ where: { uuid: providerUuid, status: "active" }, transaction });
        if (!provider) return refuse(404, "Choose an active capital provider to redirect to");
        if (provider.id === introduction.capitalProviderId) return refuse(400, "Choose a different capital provider");
        replacement = await CapitalIntroduction.create({
          capitalRequestId: introduction.capitalRequestId,
          businessId: introduction.businessId,
          capitalProviderId: provider.id,
          initiatedBy: "manager",
          requestedById: req.user.id,
          requestType: introduction.requestType,
          message: introduction.editedMessage || introduction.message,
          status: "pending_review",
        }, { transaction });
        Object.assign(values, { status: "replaced", replacedByProviderId: provider.id, reviewNote: note || `Redirected to ${provider.name}` });
        break;
      }

      case "schedule": {
        const when = new Date(scheduledAt);
        if (!scheduledAt || Number.isNaN(when.getTime())) return refuse(400, "Give the date and time of the introduction");
        if (introduction.status !== "approved") return refuse(409, "Approve the introduction before scheduling it");
        values.status = "scheduled";
        values.scheduledAt = when;
        if (introduction.capitalOpportunityId) {
          await CapitalOpportunity.update({ meetingAt: when, lastActivityAt: new Date(), nextAction: "Hold the introduction meeting", nextActionDate: when.toISOString().slice(0, 10) }, { where: { id: introduction.capitalOpportunityId }, transaction });
        }
        break;
      }

      default:
        break;
    }

    await introduction.update(values, { transaction });
    await transaction.commit();

    await audit(req, {
      action: `${action.replace(/_/g, " ")} - ${introduction.initiatedBy}-initiated ${introduction.requestType.replace(/_/g, " ")} between ${introduction.Business.name} and ${introduction.CapitalProvider.name}`,
      actionKey: `introduction.${action}`,
      entity: { type: "capital_introduction", id: introduction.id, uuid: introduction.uuid },
      opportunity: opportunity || (introduction.capitalOpportunityId ? { id: introduction.capitalOpportunityId } : null),
      businessId: introduction.businessId,
      providerId: introduction.capitalProviderId,
      oldValue: before,
      newValue: { status: introduction.status, editedMessage: introduction.editedMessage, replacedByProviderId: introduction.replacedByProviderId },
      details: note ? { note } : undefined,
    });

    if (opportunity) await syncRequestStatus(req, opportunity.capitalRequestId);

    // Tell the people affected.
    const enterpriseUser = introduction.Business.userId;
    const providerUser = introduction.CapitalProvider.userId;
    const requester = introduction.requestedById;
    const provider = introduction.CapitalProvider.name;
    const enterprise = introduction.Business.name;

    if (action === "approve" || action === "provide_information") {
      if (enterpriseUser) await notify({ userIds: [enterpriseUser], type: "capital.introduction.approved", message: `Anza approved your introduction with ${provider} (${opportunity.reference})`, link: "/dashboard/capital" });
      if (providerUser) await notify({ userIds: [providerUser], type: "capital.introduction.approved", message: `Anza approved your introduction with ${enterprise} (${opportunity.reference})`, link: "/dashboard/capital-deals" });
    } else if (["decline", "request_changes", "request_clarification"].includes(action) && requester) {
      const said = { decline: "declined", request_changes: "asked for changes to", request_clarification: "asked for clarification on" }[action];
      await notify({ userIds: [requester], type: `capital.introduction.${action}`, message: `Anza ${said} your request involving ${introduction.initiatedBy === "provider" ? enterprise : provider}`, link: introduction.initiatedBy === "provider" ? "/dashboard/capital-deals" : "/dashboard/capital" });
    } else if (action === "request_enterprise_permission" && enterpriseUser) {
      await notify({ userIds: [enterpriseUser], type: "capital.permission.requested", message: `A capital provider has asked for your ${introduction.requestType.replace(/_/g, " ")}. Anza needs your permission to share it.`, link: "/dashboard/capital" });
    } else if (action === "schedule") {
      const at = values.scheduledAt.toLocaleString("en-GB");
      if (enterpriseUser) await notify({ userIds: [enterpriseUser], type: "capital.meeting.scheduled", message: `Your introduction with ${provider} is scheduled for ${at}`, link: "/dashboard/capital" });
      if (providerUser) await notify({ userIds: [providerUser], type: "capital.meeting.scheduled", message: `Your introduction with ${enterprise} is scheduled for ${at}`, link: "/dashboard/capital-deals" });
    }

    successResponse(res, {
      uuid: introduction.uuid,
      status: introduction.status,
      opportunity: opportunity ? { uuid: opportunity.uuid, reference: opportunity.reference } : null,
      replacement: replacement ? { uuid: replacement.uuid } : null,
    });
  } catch (error) {
    await transaction.rollback();
    errorResponse(res, error);
  }
};

// ---- Enterprise -------------------------------------------------------------

// The providers an enterprise can ask to be introduced to. What they back is
// shown; how to reach them is not, until Anza approves an introduction.
const providerDirectory = async (req, res) => {
  try {
    const where = { status: "active" };
    if (req.query.type) where.providerType = req.query.type;
    if (req.query.q) where.name = { [Op.like]: `%${req.query.q}%` };

    const providers = await CapitalProvider.findAll({ where, order: [["name", "ASC"]] });
    successResponse(res, {
      data: providers.map((provider) => {
        const shaped = shapeProvider(provider);
        delete shaped.previousTransactions;
        return shaped;
      }),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const requestIntroduction = async (req, res) => {
  try {
    const business = await myBusiness(req.user.id);
    if (!business) return fail(res, 400, "Register your business before requesting introductions");

    const { providerUuid, capitalRequestUuid, message } = req.body;
    if (!String(message || "").trim()) return fail(res, 400, "Write a message for the capital provider");

    const provider = await CapitalProvider.findOne({ where: { uuid: providerUuid, status: "active" } });
    if (!provider) return fail(res, 404, "Capital provider not found");

    const request = await CapitalRequest.findOne({ where: { uuid: capitalRequestUuid, businessId: business.id } });
    if (!request) return fail(res, 400, "Choose the capital request this introduction is for");
    if (["draft", "declined", "closed"].includes(request.status)) return fail(res, 409, "Submit an open capital request first");

    const open = await CapitalIntroduction.findOne({ where: { businessId: business.id, capitalProviderId: provider.id, status: { [Op.in]: CapitalIntroduction.OPEN } } });
    if (open) return fail(res, 409, "You already have an introduction to this provider waiting for Anza's review");

    const introduction = await CapitalIntroduction.create({
      capitalRequestId: request.id,
      businessId: business.id,
      capitalProviderId: provider.id,
      initiatedBy: "enterprise",
      requestedById: req.user.id,
      requestType: "introduction",
      message: String(message).trim(),
      status: "pending_review",
    });

    await audit(req, {
      action: `${business.name} requested an introduction to ${provider.name}`,
      actionKey: "introduction.requested",
      entity: { type: "capital_introduction", id: introduction.id, uuid: introduction.uuid },
      businessId: business.id,
      providerId: provider.id,
      newValue: { capitalRequest: request.reference, message: introduction.message },
    });

    await notifyManagers({ managerId: request.assignedManagerId, type: "capital.introduction.requested", message: `${business.name} asked to be introduced to ${provider.name}`, link: "/dashboard/capital/introductions" });

    successResponse(res, shapeIntroduction(introduction, { provider: { uuid: provider.uuid, name: provider.name } }));
  } catch (error) {
    errorResponse(res, error);
  }
};

const myIntroductions = async (req, res) => {
  try {
    const business = await myBusiness(req.user.id);
    if (!business) return successResponse(res, { data: [] });

    const rows = await CapitalIntroduction.findAll({
      where: { businessId: business.id },
      include: [{ model: CapitalProvider }, { model: CapitalOpportunity, attributes: ["uuid", "reference", "stage", "introductionApprovedAt"] }],
      order: [["createdAt", "DESC"]],
    });

    successResponse(res, {
      data: rows.map((row) => {
        const approved = !!(row.CapitalOpportunity && row.CapitalOpportunity.introductionApprovedAt);
        return shapeIntroduction(row, {
          // The internal edit and the manager's reasoning stay with Anza; the
          // enterprise sees the outcome and any note written for it.
          editedMessage: undefined,
          provider: shapeProvider(row.CapitalProvider, { revealContacts: approved }),
          opportunity: row.CapitalOpportunity ? { uuid: row.CapitalOpportunity.uuid, reference: row.CapitalOpportunity.reference, stage: row.CapitalOpportunity.stage } : null,
          awaitingMyPermission: row.status === "awaiting_enterprise_permission",
        });
      }),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const respondToPermission = async (req, res) => {
  try {
    const { decision } = req.body;
    if (!["granted", "denied"].includes(decision)) return fail(res, 400, "Decision must be granted or denied");

    const business = await myBusiness(req.user.id);
    const introduction = business && (await CapitalIntroduction.findOne({ where: { uuid: req.params.uuid, businessId: business.id }, include: [{ model: CapitalProvider, attributes: ["id", "name"] }] }));
    if (!introduction) return fail(res, 404, "Request not found");
    if (introduction.status !== "awaiting_enterprise_permission") return fail(res, 409, "This request is not waiting for your permission");

    await introduction.update({ enterprisePermission: decision, status: decision === "granted" ? "pending_review" : "permission_denied" });

    await audit(req, {
      action: `${business.name} ${decision === "granted" ? "granted" : "refused"} permission to share its ${introduction.requestType.replace(/_/g, " ")} with ${introduction.CapitalProvider.name}`,
      actionKey: `introduction.permission_${decision}`,
      entity: { type: "capital_introduction", id: introduction.id, uuid: introduction.uuid },
      businessId: business.id,
      providerId: introduction.capitalProviderId,
      oldValue: { enterprisePermission: "pending" },
      newValue: { enterprisePermission: decision },
    });

    await notifyManagers({ type: `capital.permission.${decision}`, message: `${business.name} ${decision === "granted" ? "agreed" : "declined"} to share its ${introduction.requestType.replace(/_/g, " ")} with ${introduction.CapitalProvider.name}`, link: "/dashboard/capital/introductions" });

    successResponse(res, { uuid: introduction.uuid, status: introduction.status, enterprisePermission: decision });
  } catch (error) {
    errorResponse(res, error);
  }
};

// ---- Capital provider -------------------------------------------------------

// Enterprises seeking capital, as a provider may see them before any
// introduction: what they do and what they need, never how to reach them.
const enterpriseDirectory = async (req, res) => {
  try {
    const requests = await CapitalRequest.findAll({
      where: { status: { [Op.in]: MATCHABLE } },
      include: [withBusiness],
      order: [["submittedAt", "DESC"]],
    });

    const seen = new Set();
    const data = [];
    for (const request of requests) {
      if (!request.Business || seen.has(request.businessId)) continue;
      seen.add(request.businessId);
      data.push({
        enterprise: shapeBusiness(request.Business),
        amountRequested: request.amountRequested,
        currency: request.currency,
        financingType: request.financingType,
        readinessStatus: request.readinessStatus,
        purpose: request.purpose,
      });
    }

    successResponse(res, { data });
  } catch (error) {
    errorResponse(res, error);
  }
};

const expressInterest = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const provider = await myProvider(req.user);
    if (!provider) {
      await transaction.rollback();
      return fail(res, 403, "Only a capital provider can express interest");
    }

    const business = await Business.findOne({ where: { uuid: req.body.businessUuid }, transaction });
    if (!business) {
      await transaction.rollback();
      return fail(res, 404, "Enterprise not found");
    }

    const { introduction, error, code } = await createProviderInterest({
      req,
      provider,
      business,
      requestType: req.body.requestType || "introduction",
      message: req.body.message ? String(req.body.message).trim() : null,
      transaction,
    });
    if (error) {
      await transaction.rollback();
      return fail(res, code, error);
    }

    await transaction.commit();

    await audit(req, {
      action: `${provider.name} asked for ${introduction.requestType.replace(/_/g, " ")} with ${business.name}`,
      actionKey: "introduction.provider_interest",
      entity: { type: "capital_introduction", id: introduction.id, uuid: introduction.uuid },
      businessId: business.id,
      providerId: provider.id,
      newValue: { requestType: introduction.requestType, message: introduction.message },
    });

    await notifyManagers({ type: "capital.provider.interest", message: `${provider.name} expressed interest in ${business.name} (${introduction.requestType.replace(/_/g, " ")})`, link: "/dashboard/capital/introductions" });

    successResponse(res, shapeIntroduction(introduction));
  } catch (error) {
    await transaction.rollback();
    errorResponse(res, error);
  }
};

const myProviderIntroductions = async (req, res) => {
  try {
    const provider = await myProvider(req.user);
    if (!provider) return successResponse(res, { data: [] });

    const rows = await CapitalIntroduction.findAll({
      where: { capitalProviderId: provider.id },
      include: [withBusiness, { model: User, as: "requestedBy", attributes: ["uuid", "name", "email", "phone"] }, { model: CapitalOpportunity, attributes: ["uuid", "reference", "stage", "introductionApprovedAt"] }],
      order: [["createdAt", "DESC"]],
    });

    successResponse(res, {
      data: rows.map((row) => {
        const approved = !!(row.CapitalOpportunity && row.CapitalOpportunity.introductionApprovedAt);
        return shapeIntroduction(row, {
          editedMessage: undefined,
          enterprise: shapeBusiness(row.Business, { revealContacts: approved }),
          opportunity: row.CapitalOpportunity ? { uuid: row.CapitalOpportunity.uuid, reference: row.CapitalOpportunity.reference, stage: row.CapitalOpportunity.stage } : null,
        });
      }),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  NEEDS_ENTERPRISE_PERMISSION,
  createProviderInterest,
  listIntroductions,
  reviewIntroduction,
  providerDirectory,
  requestIntroduction,
  myIntroductions,
  respondToPermission,
  enterpriseDirectory,
  expressInterest,
  myProviderIntroductions,
};
