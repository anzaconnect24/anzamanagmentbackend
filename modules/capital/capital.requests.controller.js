// Capital requests: an enterprise asks for capital, and the request waits in
// the Capital Facilitation Manager's review queue before anything is matched.
const { Op } = require("sequelize");
const {
  Business,
  BusinessSector,
  CapitalDocument,
  CapitalIntroduction,
  CapitalNote,
  CapitalOpportunity,
  CapitalProvider,
  CapitalRequest,
  CohortMembership,
  CohortProgram,
  Log,
  User,
  sequelize,
} = require("../../models");
const { errorResponse, successResponse } = require("../../utils/responses");
const { audit, diff } = require("../../utils/capital_audit");
const { can, CFM_ROLE } = require("../../utils/capital_access");
const { notify, notifyManagers } = require("../../utils/capital_notify");
const { toUsd } = require("../../utils/capital_match");
const { createWithReference } = require("../../utils/capital_reference");
const { removeStored } = require("../../utils/capital_upload");
const {
  businessInclude,
  dateRange,
  fail,
  myBusiness,
  resolveFilterIds,
  shapeBusiness,
  shapeUser,
} = require("./capital.shared");

const ENTERPRISE_FIELDS = ["amountRequested", "currency", "financingType", "purpose", "preferredProviderTypes", "currentRevenue", "revenueCurrency", "traction", "founderGender", "youthLed"];

// Reads the enterprise-editable part of a request. Returns { values } or { error }.
const readRequest = (body, { partial = false } = {}) => {
  const values = {};

  if (body.amountRequested !== undefined) {
    const amount = Number(body.amountRequested);
    if (!Number.isFinite(amount) || amount <= 0) return { error: "The amount requested must be a positive number" };
    values.amountRequested = amount;
  } else if (!partial) return { error: "Say how much capital is needed" };

  if (body.financingType !== undefined) {
    if (!CapitalRequest.FINANCING_TYPES.includes(body.financingType)) return { error: `Type of financing must be one of ${CapitalRequest.FINANCING_TYPES.join(", ")}` };
    values.financingType = body.financingType;
  } else if (!partial) return { error: "Choose the type of financing" };

  if (body.currency !== undefined) values.currency = String(body.currency || "USD").toUpperCase().slice(0, 8);
  if (body.revenueCurrency !== undefined) values.revenueCurrency = body.revenueCurrency ? String(body.revenueCurrency).toUpperCase().slice(0, 8) : null;
  if (body.purpose !== undefined) values.purpose = body.purpose || null;
  if (body.traction !== undefined) values.traction = body.traction || null;
  if (body.founderGender !== undefined) values.founderGender = body.founderGender || null;
  if (body.youthLed !== undefined) values.youthLed = body.youthLed === null || body.youthLed === "" ? null : body.youthLed === true || body.youthLed === "true";
  if (body.preferredProviderTypes !== undefined) {
    values.preferredProviderTypes = (Array.isArray(body.preferredProviderTypes) ? body.preferredProviderTypes : [])
      .filter((type) => CapitalProvider.TYPES.includes(type));
  }
  if (body.currentRevenue !== undefined) {
    if (body.currentRevenue === "" || body.currentRevenue === null) values.currentRevenue = null;
    else if (!Number.isFinite(Number(body.currentRevenue)) || Number(body.currentRevenue) < 0) return { error: "Current revenue must be a non-negative number" };
    else values.currentRevenue = Number(body.currentRevenue);
  }

  if (!partial && !values.purpose) return { error: "Describe what the funding is for" };

  return { values };
};

const summary = (row, { opportunities = [] } = {}) => ({
  uuid: row.uuid,
  reference: row.reference,
  status: row.status,
  amountRequested: row.amountRequested,
  currency: row.currency,
  amountUsd: row.amountUsd,
  financingType: row.financingType,
  readinessStatus: row.readinessStatus,
  submittedAt: row.submittedAt,
  updatedAt: row.updatedAt,
  business: shapeBusiness(row.Business),
  leader: row.leader ? { uuid: row.leader.uuid, name: row.leader.name } : null,
  programme: row.CohortProgram ? { uuid: row.CohortProgram.uuid, title: row.CohortProgram.title } : null,
  assignedManager: row.assignedManager ? { uuid: row.assignedManager.uuid, name: row.assignedManager.name } : null,
  opportunities: opportunities.length,
  highestMatchScore: opportunities.reduce((best, item) => Math.max(best, item.matchScore || 0), 0) || null,
});

// ---- Manager: the review queue --------------------------------------------

const listRequests = async (req, res) => {
  try {
    const query = req.query;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 25));
    const ids = await resolveFilterIds(query);

    const where = {};
    if (query.awaiting === "1") where.status = { [Op.in]: CapitalRequest.AWAITING_REVIEW };
    else if (query.status) where.status = query.status;
    else where.status = { [Op.ne]: "draft" };
    if (query.financingType) where.financingType = query.financingType;
    if (ids.cohortProgramId) where.cohortProgramId = ids.cohortProgramId;
    if (ids.managerId) where.assignedManagerId = ids.managerId;
    const range = dateRange(query);
    if (range) where.submittedAt = range;
    if (query.amountMin || query.amountMax) {
      where.amountUsd = {};
      if (query.amountMin) where.amountUsd[Op.gte] = Number(query.amountMin);
      if (query.amountMax) where.amountUsd[Op.lte] = Number(query.amountMax);
    }

    const include = [
      businessInclude(query),
      { model: User, as: "leader", attributes: ["uuid", "name"] },
      { model: User, as: "assignedManager", attributes: ["uuid", "name"] },
      { model: CohortProgram, attributes: ["uuid", "title"] },
    ];
    if (query.q) include[0] = { ...include[0], required: true, where: { ...(include[0].where || {}), name: { [Op.like]: `%${query.q}%` } } };

    const { count, rows } = await CapitalRequest.findAndCountAll({
      where,
      include,
      order: [["submittedAt", "DESC"], ["id", "DESC"]],
      limit,
      offset: (page - 1) * limit,
      distinct: true,
    });

    const opportunities = rows.length
      ? await CapitalOpportunity.findAll({ where: { capitalRequestId: { [Op.in]: rows.map((row) => row.id) } }, attributes: ["capitalRequestId", "matchScore"], raw: true })
      : [];

    successResponse(res, {
      count,
      page,
      totalPages: Math.ceil(count / limit),
      data: rows.map((row) => summary(row, { opportunities: opportunities.filter((item) => item.capitalRequestId === row.id) })),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getRequest = async (req, res) => {
  try {
    const request = await CapitalRequest.findOne({
      where: { uuid: req.params.uuid },
      include: [
        { model: Business, include: [{ model: BusinessSector, attributes: ["name"] }] },
        { model: User, as: "leader", attributes: ["uuid", "name", "email", "phone", "role"] },
        { model: User, as: "assignedManager", attributes: ["uuid", "name"] },
        { model: User, as: "reviewer", attributes: ["uuid", "name"] },
        { model: CohortProgram, attributes: ["uuid", "title"] },
      ],
    });
    if (!request) return fail(res, 404, "Capital request not found");

    const [documents, opportunities, introductions, notes, trail] = await Promise.all([
      CapitalDocument.findAll({
        where: { capitalRequestId: request.id, deletedAt: null },
        include: [{ model: User, as: "uploadedBy", attributes: ["uuid", "name", "role"] }],
        order: [["createdAt", "DESC"]],
      }),
      CapitalOpportunity.findAll({
        where: { capitalRequestId: request.id },
        include: [{ model: CapitalProvider, attributes: ["uuid", "name", "providerType"] }],
        order: [["createdAt", "ASC"]],
      }),
      CapitalIntroduction.findAll({
        where: { capitalRequestId: request.id },
        include: [{ model: CapitalProvider, attributes: ["uuid", "name"] }],
        order: [["createdAt", "DESC"]],
      }),
      (await can(req, "capital.notes.manage"))
        ? CapitalNote.findAll({ where: { subjectType: "request", subjectId: request.id }, include: [{ model: User, as: "author", attributes: ["uuid", "name"] }], order: [["createdAt", "DESC"]] })
        : [],
      (await can(req, "capital.audit.view"))
        ? Log.findAll({ where: { module: "capital", resourceUuid: request.uuid }, include: [{ model: User, attributes: ["uuid", "name"] }], order: [["createdAt", "DESC"]], limit: 100 })
        : [],
    ]);

    const data = request.toJSON();

    successResponse(res, {
      ...summary(request, { opportunities }),
      purpose: data.purpose,
      preferredProviderTypes: data.preferredProviderTypes,
      currentRevenue: data.currentRevenue,
      revenueCurrency: data.revenueCurrency,
      traction: data.traction,
      founderGender: data.founderGender,
      youthLed: data.youthLed,
      infoRequest: data.infoRequest,
      recommendations: data.recommendations,
      declineReason: data.declineReason,
      reviewedAt: data.reviewedAt,
      reviewer: data.reviewer,
      legacyRequest: !!data.legacyRequestId,
      business: shapeBusiness(request.Business, { revealContacts: true }),
      leader: shapeUser(request.leader, { revealContacts: true }),
      documents: documents.map((doc) => ({
        uuid: doc.uuid,
        title: doc.title,
        category: doc.category,
        visibility: doc.visibility,
        version: doc.version,
        originalName: doc.originalName,
        sizeBytes: doc.sizeBytes,
        uploadedBy: doc.uploadedBy ? { name: doc.uploadedBy.name, role: doc.uploadedBy.role } : null,
        createdAt: doc.createdAt,
      })),
      opportunityList: opportunities.map((item) => ({
        uuid: item.uuid,
        reference: item.reference,
        provider: item.CapitalProvider,
        stage: item.stage,
        status: item.status,
        outcome: item.outcome,
        matchScore: item.matchScore,
        potentialAmount: item.potentialAmount,
        amountCommitted: item.amountCommitted,
        currency: item.currency,
      })),
      introductions: introductions.map((item) => ({
        uuid: item.uuid,
        provider: item.CapitalProvider,
        initiatedBy: item.initiatedBy,
        requestType: item.requestType,
        status: item.status,
        createdAt: item.createdAt,
      })),
      notes: notes.map((note) => ({ uuid: note.uuid, body: note.body, author: note.author, createdAt: note.createdAt })),
      auditTrail: trail.map((row) => ({ action: row.action, user: row.User, role: row.role, oldValue: row.oldValue, newValue: row.newValue, createdAt: row.createdAt })),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// The review actions, each with the statuses it may start from and the one it
// leaves the request in. null means "stays where it is".
const REVIEW_ACTIONS = {
  start_review: { from: ["submitted", "more_information_required"], to: "under_review" },
  request_information: { from: ["submitted", "under_review", "approved_for_matching"], to: "more_information_required", needs: "note" },
  approve_for_matching: { from: ["submitted", "under_review", "more_information_required", "on_hold"], to: "approved_for_matching" },
  hold: { from: CapitalRequest.STATUSES.filter((s) => !["draft", "declined", "closed", "on_hold", "disbursed"].includes(s)), to: "on_hold", needs: "note" },
  decline: { from: ["submitted", "under_review", "more_information_required", "approved_for_matching", "on_hold"], to: "declined", needs: "note" },
  recommend: { from: CapitalRequest.STATUSES.filter((s) => s !== "draft"), to: null, needs: "recommendations" },
  assign: { from: CapitalRequest.STATUSES, to: null, needs: "managerUuid" },
  reopen: { from: ["on_hold", "declined"], to: "under_review" },
  close: { from: CapitalRequest.STATUSES.filter((s) => s !== "closed"), to: "closed", needs: "note" },
};

const reviewRequest = async (req, res) => {
  const transaction = await sequelize.transaction();
  const refuse = async (code, message) => {
    await transaction.rollback();
    return fail(res, code, message);
  };

  try {
    const { action, note, recommendations, readinessStatus, managerUuid, internal } = req.body;
    const rule = REVIEW_ACTIONS[action];
    if (!rule) return refuse(400, `Action must be one of ${Object.keys(REVIEW_ACTIONS).join(", ")}`);

    const request = await CapitalRequest.findOne({ where: { uuid: req.params.uuid }, include: [{ model: Business, attributes: ["id", "name", "userId"] }], transaction });
    if (!request) return refuse(404, "Capital request not found");
    if (!rule.from.includes(request.status)) return refuse(409, `A request that is ${request.status.replace(/_/g, " ")} cannot be ${action.replace(/_/g, " ")}`);

    if (rule.needs === "note" && !String(note || "").trim()) return refuse(400, "Give a reason for this decision");
    if (rule.needs === "recommendations" && !String(recommendations || "").trim()) return refuse(400, "Write the recommended improvements");

    if (action === "decline" || action === "close") {
      const active = await CapitalOpportunity.count({ where: { capitalRequestId: request.id, status: "active" }, transaction });
      if (active) return refuse(409, `Close its ${active} active ${active === 1 ? "opportunity" : "opportunities"} first`);
    }

    const before = request.toJSON();
    const values = {};
    if (rule.to) values.status = rule.to;

    if (readinessStatus !== undefined) {
      if (!CapitalRequest.READINESS.includes(readinessStatus)) return refuse(400, `Capital readiness must be one of ${CapitalRequest.READINESS.join(", ")}`);
      values.readinessStatus = readinessStatus;
    }
    if (action === "request_information") values.infoRequest = String(note).trim();
    if (action === "decline") values.declineReason = String(note).trim();
    if (action === "recommend") values.recommendations = String(recommendations).trim();

    let manager = null;
    if (action === "assign") {
      manager = await User.findOne({ where: { uuid: managerUuid, role: CFM_ROLE, activated: true }, attributes: ["id", "uuid", "name"], transaction });
      if (!manager) return refuse(400, "Assign the request to an active Capital Facilitation Manager");
      values.assignedManagerId = manager.id;
    }
    if (!["assign", "recommend"].includes(action)) {
      values.reviewedAt = new Date();
      values.reviewedById = req.user.id;
    }
    if (!request.assignedManagerId && !values.assignedManagerId) values.assignedManagerId = req.user.id;

    await request.update(values, { transaction });

    // A reason given for an internal decision can also be kept as a
    // confidential note, where only managers will ever read it.
    if (internal && String(note || "").trim()) {
      await CapitalNote.create({ subjectType: "request", subjectId: request.id, body: String(note).trim(), authorId: req.user.id }, { transaction });
    }

    await transaction.commit();

    const change = diff(before, values);
    await audit(req, {
      action: `${action.replace(/_/g, " ")} - capital request ${request.reference}`,
      actionKey: `request.${action}`,
      entity: { type: "capital_request", id: request.id, uuid: request.uuid },
      businessId: request.businessId,
      oldValue: change.oldValue,
      newValue: change.newValue,
      details: note ? { note: internal ? "(kept as internal note)" : note } : undefined,
    });

    // Tell the enterprise what they need to know - never an internal note.
    const enterpriseUser = request.Business && request.Business.userId;
    const messages = {
      request_information: `Anza needs more information on your capital request ${request.reference}`,
      approve_for_matching: `Your capital request ${request.reference} has been approved for matching with capital providers`,
      decline: `Your capital request ${request.reference} was not taken forward`,
      recommend: `Anza has recommended improvements to your capital request ${request.reference}`,
      hold: `Your capital request ${request.reference} has been put on hold`,
    };
    if (messages[action] && enterpriseUser) {
      await notify({ userIds: [enterpriseUser], type: `capital.request.${action}`, message: messages[action], link: "/dashboard/capital" });
    }
    if (manager && manager.id !== req.user.id) {
      await notify({ userIds: [manager.id], type: "capital.request.assigned", message: `Capital request ${request.reference} (${request.Business.name}) was assigned to you`, link: `/dashboard/capital/requests/${request.uuid}` });
    }

    successResponse(res, { uuid: request.uuid, status: request.status, assignedManagerId: request.assignedManagerId });
  } catch (error) {
    await transaction.rollback();
    errorResponse(res, error);
  }
};

// ---- Enterprise: asking for capital ---------------------------------------

const enterpriseView = (row) => ({
  uuid: row.uuid,
  reference: row.reference,
  status: row.status,
  amountRequested: row.amountRequested,
  currency: row.currency,
  financingType: row.financingType,
  purpose: row.purpose,
  preferredProviderTypes: row.preferredProviderTypes,
  currentRevenue: row.currentRevenue,
  revenueCurrency: row.revenueCurrency,
  traction: row.traction,
  founderGender: row.founderGender,
  youthLed: row.youthLed,
  readinessStatus: row.readinessStatus,
  infoRequest: row.infoRequest,
  recommendations: row.recommendations,
  declineReason: row.declineReason,
  submittedAt: row.submittedAt,
  updatedAt: row.updatedAt,
});

const myRequests = async (req, res) => {
  try {
    const business = await myBusiness(req.user.id);
    if (!business) return successResponse(res, { business: null, data: [] });

    const rows = await CapitalRequest.findAll({ where: { businessId: business.id }, order: [["createdAt", "DESC"]] });
    const documents = rows.length
      ? await CapitalDocument.findAll({ where: { capitalRequestId: { [Op.in]: rows.map((row) => row.id) }, deletedAt: null, visibility: { [Op.in]: ["enterprise", "both"] } }, order: [["createdAt", "DESC"]] })
      : [];

    successResponse(res, {
      business: shapeBusiness(business),
      data: rows.map((row) => ({
        ...enterpriseView(row),
        documents: documents
          .filter((doc) => doc.capitalRequestId === row.id)
          .map((doc) => ({ uuid: doc.uuid, title: doc.title, category: doc.category, originalName: doc.originalName, createdAt: doc.createdAt })),
      })),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const createRequest = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const business = await myBusiness(req.user.id);
    if (!business) {
      await transaction.rollback();
      return fail(res, 400, "Register your business before asking for capital");
    }

    const { values, error } = readRequest(req.body);
    if (error) {
      await transaction.rollback();
      return fail(res, 400, error);
    }

    const submit = req.body.submit !== false;
    const membership = await CohortMembership.findOne({ where: { businessId: business.id }, order: [["createdAt", "DESC"]], attributes: ["cohortProgramId"], transaction });

    const request = await createWithReference(CapitalRequest, "CR", {
      ...values,
      currency: values.currency || "USD",
      amountUsd: toUsd(values.amountRequested, values.currency || "USD"),
      businessId: business.id,
      userId: req.user.id,
      cohortProgramId: membership ? membership.cohortProgramId : null,
      status: submit ? "submitted" : "draft",
      submittedAt: submit ? new Date() : null,
    }, { transaction });

    await transaction.commit();

    await audit(req, {
      action: `${submit ? "Submitted" : "Drafted"} capital request ${request.reference}`,
      actionKey: submit ? "request.submitted" : "request.drafted",
      entity: { type: "capital_request", id: request.id, uuid: request.uuid },
      businessId: business.id,
      newValue: values,
    });

    if (submit) {
      await notifyManagers({ type: "capital.request.submitted", message: `New capital request ${request.reference} from ${business.name}`, link: `/dashboard/capital/requests/${request.uuid}` });
    }

    successResponse(res, enterpriseView(request));
  } catch (error) {
    await transaction.rollback();
    errorResponse(res, error);
  }
};

// An enterprise edits its own request while it is a draft or when Anza has
// asked for more information, and (re)submits it.
const updateMyRequest = async (req, res) => {
  try {
    const business = await myBusiness(req.user.id);
    const request = business && (await CapitalRequest.findOne({ where: { uuid: req.params.uuid, businessId: business.id } }));
    if (!request) return fail(res, 404, "Capital request not found");

    if (!["draft", "more_information_required"].includes(request.status)) {
      return fail(res, 409, "This request is being reviewed and can no longer be edited");
    }

    const { values, error } = readRequest(req.body, { partial: true });
    if (error) return fail(res, 400, error);

    if (values.amountRequested !== undefined || values.currency !== undefined) {
      values.amountUsd = toUsd(values.amountRequested ?? request.amountRequested, values.currency ?? request.currency);
    }

    const submit = req.body.submit === true;
    const before = request.toJSON();
    if (submit) {
      if (!(values.purpose ?? request.purpose)) return fail(res, 400, "Describe what the funding is for");
      values.status = "submitted";
      values.submittedAt = request.submittedAt || new Date();
    }

    await request.update(values);
    const change = diff(before, values);

    await audit(req, {
      action: `${submit ? "Submitted" : "Updated"} capital request ${request.reference}`,
      actionKey: submit ? "request.resubmitted" : "request.edited",
      entity: { type: "capital_request", id: request.id, uuid: request.uuid },
      businessId: request.businessId,
      oldValue: change.oldValue,
      newValue: change.newValue,
    });

    if (submit) {
      await notifyManagers({
        managerId: request.assignedManagerId,
        type: before.status === "draft" ? "capital.request.submitted" : "capital.request.information_provided",
        message: before.status === "draft" ? `New capital request ${request.reference} from ${business.name}` : `${business.name} updated capital request ${request.reference}`,
        link: `/dashboard/capital/requests/${request.uuid}`,
      });
    }

    successResponse(res, enterpriseView(request));
  } catch (error) {
    errorResponse(res, error);
  }
};

// A supporting document on a request: pitch deck, business plan, financial
// model, due diligence files. The enterprise uploads to its own request; a
// manager can upload to any.
const uploadRequestDocument = async (req, res) => {
  try {
    if (!req.file) return fail(res, 400, "Choose a file to upload");

    const request = await CapitalRequest.findOne({ where: { uuid: req.params.uuid }, include: [{ model: Business, attributes: ["id", "userId", "name"] }] });
    const manager = await can(req, "capital.requests.review");
    const owner = request && request.Business && request.Business.userId === req.user.id;

    if (!request || (!manager && !owner)) {
      removeStored(req.file.filename);
      return fail(res, 404, "Capital request not found");
    }

    const category = CapitalDocument.CATEGORIES.includes(req.body.category) ? req.body.category : "other";
    const visibility = manager && CapitalDocument.VISIBILITIES.includes(req.body.visibility) ? req.body.visibility : manager ? "internal" : "enterprise";

    const document = await CapitalDocument.create({
      capitalRequestId: request.id,
      businessId: request.businessId,
      category,
      title: String(req.body.title || req.file.originalname).slice(0, 255),
      originalName: req.file.originalname.slice(0, 255),
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      visibility,
      uploadedById: req.user.id,
    });

    await audit(req, {
      action: `Uploaded ${category.replace(/_/g, " ")} "${document.title}" to capital request ${request.reference}`,
      actionKey: "document.uploaded",
      entity: { type: "capital_document", id: document.id, uuid: document.uuid },
      businessId: request.businessId,
      newValue: { title: document.title, category, visibility, sizeBytes: document.sizeBytes },
    });

    if (owner) {
      await notifyManagers({ managerId: request.assignedManagerId, type: "capital.document.uploaded", message: `${request.Business.name} uploaded "${document.title}" to ${request.reference}`, link: `/dashboard/capital/requests/${request.uuid}` });
    }

    successResponse(res, { uuid: document.uuid, title: document.title, category, visibility });
  } catch (error) {
    if (req.file) removeStored(req.file.filename);
    errorResponse(res, error);
  }
};

// ---- Deleting a request -----------------------------------------------------
//
// Deletion is soft: the request disappears from every list, while its row, its
// audit trail and its documents stay for the record. A request that has become
// capital opportunities is never deleted - their history hangs off it - so it
// is closed instead.

// What an enterprise may still withdraw on its own: nothing Anza has acted on.
const ENTERPRISE_DELETABLE = ["draft", "submitted", "more_information_required"];

// Returns { introductions, documents } or { code, error }.
const removeRequest = async (req, request, { reason, by }) => {
  const transaction = await sequelize.transaction();
  try {
    const opportunities = await CapitalOpportunity.count({ where: { capitalRequestId: request.id }, transaction });
    if (opportunities) {
      await transaction.rollback();
      return {
        code: 409,
        error: `This request has ${opportunities} capital ${opportunities === 1 ? "opportunity" : "opportunities"}. Close the request instead, so their history is kept.`,
      };
    }

    const now = new Date();
    const [introductions] = await CapitalIntroduction.update(
      { status: "declined", reviewNote: "The capital request was deleted", reviewedById: req.user.id, reviewedAt: now },
      { where: { capitalRequestId: request.id, status: { [Op.in]: CapitalIntroduction.OPEN } }, transaction },
    );
    const [documents] = await CapitalDocument.update(
      { deletedAt: now, deletedById: req.user.id },
      { where: { capitalRequestId: request.id, deletedAt: null }, transaction },
    );

    await request.update({ deleteReason: reason || null, deletedById: req.user.id }, { transaction });
    await request.destroy({ transaction });

    // Written in the same transaction: no audit record, no deletion.
    await audit(req, {
      action: `Deleted capital request ${request.reference}${by === "enterprise" ? " (withdrawn by the enterprise)" : ""}`,
      actionKey: "request.deleted",
      entity: { type: "capital_request", id: request.id, uuid: request.uuid },
      businessId: request.businessId,
      oldValue: { status: request.status, amountRequested: request.amountRequested, currency: request.currency },
      details: { reason: reason || null, introductionsClosed: introductions, documentsRemoved: documents },
    }, { strict: true, transaction });

    await transaction.commit();
    return { introductions, documents };
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    throw error;
  }
};

const deleteRequest = async (req, res) => {
  try {
    const reason = String((req.body && req.body.reason) || "").trim();
    if (!reason) return fail(res, 400, "Give a reason for deleting the capital request");

    const request = await CapitalRequest.findOne({
      where: { uuid: req.params.uuid },
      include: [{ model: Business, attributes: ["id", "name", "userId"] }],
    });
    if (!request) return fail(res, 404, "Capital request not found");

    const result = await removeRequest(req, request, { reason, by: "manager" });
    if (result.error) return fail(res, result.code, result.error);

    if (request.Business && request.Business.userId) {
      await notify({
        userIds: [request.Business.userId],
        type: "capital.request.deleted",
        message: `Anza removed your capital request ${request.reference}: ${reason.slice(0, 160)}`,
        link: "/dashboard/capital/applications",
      });
    }

    successResponse(res, { uuid: request.uuid, deleted: true, ...result });
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteMyRequest = async (req, res) => {
  try {
    const business = await myBusiness(req.user.id);
    const request = business && (await CapitalRequest.findOne({ where: { uuid: req.params.uuid, businessId: business.id } }));
    if (!request) return fail(res, 404, "Capital request not found");

    if (!ENTERPRISE_DELETABLE.includes(request.status)) {
      return fail(res, 409, "Anza is already working on this application. Ask your Capital Facilitation Manager to close it.");
    }

    const reason = String((req.body && req.body.reason) || "").trim();
    const result = await removeRequest(req, request, { reason, by: "enterprise" });
    if (result.error) return fail(res, result.code, result.error);

    if (request.status !== "draft") {
      await notifyManagers({
        managerId: request.assignedManagerId,
        type: "capital.request.withdrawn",
        message: `${business.name} withdrew capital request ${request.reference}`,
        link: "/dashboard/capital/requests",
      });
    }

    successResponse(res, { uuid: request.uuid, deleted: true, ...result });
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  listRequests,
  getRequest,
  reviewRequest,
  REVIEW_ACTIONS,
  myRequests,
  createRequest,
  updateMyRequest,
  uploadRequestDocument,
  ENTERPRISE_DELETABLE,
  deleteRequest,
  deleteMyRequest,
};
