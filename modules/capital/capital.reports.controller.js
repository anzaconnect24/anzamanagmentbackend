// The Capital Facilitation dashboard and reports, the audit trail, capital
// notifications, settings, and the permission matrix.
const { Op } = require("sequelize");
const {
  Business,
  BusinessSector,
  CapitalDdItem,
  CapitalDocument,
  CapitalIntervention,
  CapitalIntroduction,
  CapitalMessage,
  CapitalOpportunity,
  CapitalProvider,
  CapitalRequest,
  CapitalSetting,
  CapitalThread,
  CohortProgram,
  Log,
  Notification,
  NotificationViewer,
  Permission,
  RolePermission,
  User,
} = require("../../models");
const { errorResponse, successResponse } = require("../../utils/responses");
const { audit } = require("../../utils/capital_audit");
const { CFM_ROLE, roleOf } = require("../../utils/capital_access");
const { toUsd } = require("../../utils/capital_match");
const { STAGES, stageIndex } = require("../../utils/capital_rules");
const {
  businessInclude,
  dateRange,
  fail,
  resolveFilterIds,
  shapeBusiness,
} = require("./capital.shared");
const { opportunityQuery } = require("./capital.opportunities.controller");
const { MATCHABLE } = require("./capital.matching.controller");

const usd = (amount, currency) => toUsd(amount || 0, currency) || 0;
const round = (value) => Math.round(value * 100) / 100;
const reached = (row, stage) => row.status === "won" || stageIndex(row.stage) >= stageIndex(stage);

// ---- Filtered data, shared by the dashboard and the reports ----------------

const requestQuery = async (query) => {
  const ids = await resolveFilterIds(query);
  const where = { status: { [Op.ne]: "draft" } };
  if (query.financingType) where.financingType = query.financingType;
  if (query.requestStatus) where.status = query.requestStatus;
  if (ids.cohortProgramId) where.cohortProgramId = ids.cohortProgramId;
  if (ids.managerId) where.assignedManagerId = ids.managerId;
  const range = dateRange(query);
  if (range) where.submittedAt = range;
  if (query.amountMin || query.amountMax) {
    where.amountUsd = {};
    if (query.amountMin) where.amountUsd[Op.gte] = Number(query.amountMin);
    if (query.amountMax) where.amountUsd[Op.lte] = Number(query.amountMax);
  }
  return {
    where,
    include: [
      businessInclude(query),
      { model: CohortProgram, attributes: ["uuid", "title"] },
      { model: User, as: "assignedManager", attributes: ["uuid", "name"] },
    ],
  };
};

const loadData = async (query) => {
  const { where: rWhere, include: rInclude } = await requestQuery(query);
  const { where: oWhere, include: oInclude } = await opportunityQuery(query);

  const [requests, opportunities] = await Promise.all([
    CapitalRequest.findAll({ where: rWhere, include: rInclude }),
    CapitalOpportunity.findAll({ where: oWhere, include: oInclude }),
  ]);

  // A provider or stage filter narrows opportunities; keep requests consistent
  // with them so a funnel never has more matched than submitted.
  const narrowed = query.provider || query.providerType || query.stage || query.status;
  const requestIds = new Set(opportunities.map((row) => row.capitalRequestId));
  return {
    requests: narrowed ? requests.filter((row) => requestIds.has(row.id)) : requests,
    opportunities,
  };
};

// ---- Dashboard --------------------------------------------------------------

const dashboard = async (req, res) => {
  try {
    const query = req.query;
    const { requests, opportunities } = await loadData(query);
    const range = dateRange(query);
    const since30 = new Date(Date.now() - 30 * 86400000);

    const [providerInterests, awaitingIntroductions, activeThreads, recent, upcoming] = await Promise.all([
      CapitalIntroduction.count({ where: { initiatedBy: "provider", ...(range ? { createdAt: range } : {}) } }),
      CapitalIntroduction.count({ where: { status: "pending_review" } }),
      CapitalMessage.findAll({
        where: { createdAt: { [Op.gte]: since30 }, status: "delivered" },
        include: [{ model: CapitalThread, attributes: ["capitalOpportunityId"], include: [{ model: CapitalOpportunity, attributes: ["id"], where: { status: "active" } }] }],
        attributes: ["capitalThreadId"],
      }),
      Log.findAll({ where: { module: "capital" }, include: [{ model: User, attributes: ["uuid", "name"] }], order: [["createdAt", "DESC"]], limit: 12 }),
      CapitalOpportunity.findAll({
        where: { status: "active", nextActionDate: { [Op.ne]: null } },
        include: [{ model: Business, attributes: ["uuid", "name"] }, { model: CapitalProvider, attributes: ["uuid", "name"] }, { model: User, as: "assignedManager", attributes: ["uuid", "name"] }],
        order: [["nextActionDate", "ASC"]],
        limit: 10,
      }),
    ]);

    const active = opportunities.filter((row) => row.status === "active");
    const live = opportunities.filter((row) => ["active", "won"].includes(row.status));
    const sum = (rows, field) => round(rows.reduce((total, row) => total + usd(row[field], row.currency), 0));

    const cards = {
      newCapitalRequests: requests.filter((row) => row.status === "submitted").length,
      requestsAwaitingReview: requests.filter((row) => CapitalRequest.AWAITING_REVIEW.includes(row.status)).length,
      providerInterestsReceived: providerInterests,
      matchesSuggested: active.filter((row) => row.stage === "matching").length,
      introductionsAwaitingApproval: awaitingIntroductions,
      activeConversations: new Set(activeThreads.map((row) => row.capitalThreadId)).size,
      dueDiligenceInProgress: active.filter((row) => ["due_diligence", "provider_review"].includes(row.stage)).length,
      dealsUnderNegotiation: active.filter((row) => ["negotiation", "term_sheet"].includes(row.stage)).length,
      commitmentsSecured: live.filter((row) => Number(row.amountCommitted) > 0).length,
      capitalDisbursedCount: live.filter((row) => Number(row.amountDisbursed) > 0).length,
      declinedClosed: requests.filter((row) => ["declined", "closed"].includes(row.status)).length + opportunities.filter((row) => ["lost", "closed"].includes(row.status)).length,
      totalCapitalRequestedUsd: round(requests.reduce((total, row) => total + usd(row.amountRequested, row.currency), 0)),
      totalCapitalUnderDiscussionUsd: sum(active.filter((row) => reached(row, "provider_interest")), "potentialAmount"),
      totalCapitalCommittedUsd: sum(live, "amountCommitted"),
      totalCapitalDisbursedUsd: sum(live, "amountDisbursed"),
      totalCapitalFacilitatedUsd: sum(opportunities.filter((row) => CapitalOpportunity.SUCCESS.includes(row.outcome)), "amountCommitted"),
    };

    successResponse(res, {
      cards,
      pipeline: STAGES.map((stage) => ({ stage, count: active.filter((row) => row.stage === stage).length })),
      upcoming: upcoming.map((row) => ({ uuid: row.uuid, reference: row.reference, enterprise: row.Business && row.Business.name, provider: row.CapitalProvider && row.CapitalProvider.name, nextAction: row.nextAction, nextActionDate: row.nextActionDate, stage: row.stage, assignedManager: row.assignedManager })),
      recentActivity: recent.map((row) => ({ action: row.action, user: row.User, role: row.role, createdAt: row.createdAt })),
      currencyNote: "Money is shown in USD at indicative rates so amounts in different currencies can be added up.",
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// ---- Reports ----------------------------------------------------------------

const GROUPS = {
  programme: { label: "Programme", from: "request", key: (r) => (r.CohortProgram ? r.CohortProgram.title : "No programme") },
  gender: { label: "Founder gender", from: "request", key: (r) => r.founderGender || "Not recorded" },
  youth: { label: "Youth-led", from: "request", key: (r) => (r.youthLed === true ? "Youth-led" : r.youthLed === false ? "Not youth-led" : "Not recorded") },
  region: { label: "Region", from: "request", key: (r) => (r.Business && r.Business.location) || "Not recorded" },
  sector: { label: "Sector", from: "request", key: (r) => (r.Business && r.Business.BusinessSector && r.Business.BusinessSector.name) || "Not recorded" },
  financingType: { label: "Financing type", from: "request", key: (r) => r.financingType },
  manager: { label: "Capital Facilitation Manager", from: "request", key: (r) => (r.assignedManager ? r.assignedManager.name : "Unassigned") },
  period: { label: "Month submitted", from: "request", key: (r) => (r.submittedAt ? new Date(r.submittedAt).toISOString().slice(0, 7) : "Not submitted") },
  stage: { label: "Enterprise stage", from: "request", key: (r) => (r.Business && r.Business.stage) || "Not recorded" },
  provider: { label: "Capital provider", from: "opportunity", key: (o) => (o.CapitalProvider ? o.CapitalProvider.name : "Unknown") },
  providerType: { label: "Capital provider type", from: "opportunity", key: (o) => (o.CapitalProvider ? o.CapitalProvider.providerType : "Unknown") },
};

const days = (from, to) => (from && to ? (new Date(to) - new Date(from)) / 86400000 : null);
const average = (values) => {
  const list = values.filter((value) => Number.isFinite(value) && value >= 0);
  return list.length ? Math.round((list.reduce((a, b) => a + b, 0) / list.length) * 10) / 10 : null;
};

const reports = async (req, res) => {
  try {
    const { requests, opportunities } = await loadData(req.query);
    const byRequest = new Map();
    for (const row of opportunities) {
      const list = byRequest.get(row.capitalRequestId) || [];
      list.push(row);
      byRequest.set(row.capitalRequestId, list);
    }
    const oppsOf = (request) => byRequest.get(request.id) || [];
    const live = opportunities.filter((row) => ["active", "won"].includes(row.status));
    const won = opportunities.filter((row) => CapitalOpportunity.SUCCESS.includes(row.outcome));
    const introduced = opportunities.filter((row) => row.introductionApprovedAt);
    const responded = introduced.filter((row) => reached(row, "provider_interest") || row.outcome === "declined_by_provider");
    const submitted = requests.filter((row) => row.status !== "draft");
    const approvedStatuses = CapitalRequest.STATUSES.slice(CapitalRequest.STATUSES.indexOf("approved_for_matching"));
    const requestOf = new Map(requests.map((row) => [row.id, row]));

    const totals = {
      totalCapitalRequests: submitted.length,
      totalCapitalRequestedUsd: round(submitted.reduce((t, r) => t + usd(r.amountRequested, r.currency), 0)),
      enterprisesSeekingCapital: new Set(submitted.map((r) => r.businessId)).size,
      enterprisesMatched: new Set(opportunities.map((o) => o.businessId)).size,
      providersEngaged: new Set(opportunities.filter((o) => reached(o, "provider_interest")).map((o) => o.capitalProviderId)).size,
      introductionsFacilitated: introduced.length,
      providerResponseRate: introduced.length ? Math.round((responded.length / introduced.length) * 100) : null,
      enteringDueDiligence: opportunities.filter((o) => reached(o, "due_diligence")).length,
      receivingOffers: opportunities.filter((o) => reached(o, "term_sheet")).length,
      receivingCommitments: opportunities.filter((o) => Number(o.amountCommitted) > 0).length,
      successfullyFinanced: won.length,
      totalCapitalCommittedUsd: round(live.reduce((t, o) => t + usd(o.amountCommitted, o.currency), 0)),
      totalCapitalDisbursedUsd: round(live.reduce((t, o) => t + usd(o.amountDisbursed, o.currency), 0)),
      totalCapitalFacilitatedUsd: round(won.reduce((t, o) => t + usd(o.amountCommitted, o.currency), 0)),
      averageFinancingUsd: won.length ? round(won.reduce((t, o) => t + usd(o.amountCommitted, o.currency), 0) / won.length) : null,
      conversionRate: submitted.length ? Math.round((new Set(won.map((o) => o.capitalRequestId)).size / submitted.length) * 100) : null,
      averageDaysRequestToCommitment: average(won.map((o) => days(requestOf.get(o.capitalRequestId) && requestOf.get(o.capitalRequestId).submittedAt, o.dateCommitted))),
      averageDaysCommitmentToDisbursement: average(won.map((o) => days(o.dateCommitted, o.dateDisbursed))),
    };

    // A true funnel: each step counts requests that got at least that far.
    const any = (request, test) => oppsOf(request).some(test);
    const funnel = [
      ["Capital requests submitted", submitted.length],
      ["Approved", submitted.filter((r) => approvedStatuses.includes(r.status) || oppsOf(r).length).length],
      ["Matched", submitted.filter((r) => oppsOf(r).length).length],
      ["Introduced", submitted.filter((r) => any(r, (o) => o.introductionApprovedAt)).length],
      ["Capital provider interested", submitted.filter((r) => any(r, (o) => reached(o, "provider_interest"))).length],
      ["Due diligence", submitted.filter((r) => any(r, (o) => reached(o, "due_diligence"))).length],
      ["Offer / term sheet", submitted.filter((r) => any(r, (o) => reached(o, "term_sheet"))).length],
      ["Commitment", submitted.filter((r) => any(r, (o) => Number(o.amountCommitted) > 0)).length],
      ["Disbursement", submitted.filter((r) => any(r, (o) => Number(o.amountDisbursed) > 0)).length],
    ].map(([label, count]) => ({ label, count }));

    let breakdown = null;
    const group = GROUPS[req.query.groupBy];
    if (group) {
      const rows = new Map();
      const row = (key) => {
        if (!rows.has(key)) rows.set(key, { key, requests: new Set(), requestedUsd: 0, opportunities: 0, committedUsd: 0, disbursedUsd: 0, financed: 0 });
        return rows.get(key);
      };

      if (group.from === "request") {
        for (const request of submitted) {
          const entry = row(String(group.key(request)));
          entry.requests.add(request.id);
          entry.requestedUsd += usd(request.amountRequested, request.currency);
          for (const o of oppsOf(request)) {
            entry.opportunities += 1;
            entry.committedUsd += ["active", "won"].includes(o.status) ? usd(o.amountCommitted, o.currency) : 0;
            entry.disbursedUsd += ["active", "won"].includes(o.status) ? usd(o.amountDisbursed, o.currency) : 0;
            if (CapitalOpportunity.SUCCESS.includes(o.outcome)) entry.financed += 1;
          }
        }
      } else {
        for (const o of opportunities) {
          const entry = row(String(group.key(o)));
          const request = requestOf.get(o.capitalRequestId);
          if (request && !entry.requests.has(request.id)) {
            entry.requests.add(request.id);
            entry.requestedUsd += usd(request.amountRequested, request.currency);
          }
          entry.opportunities += 1;
          entry.committedUsd += ["active", "won"].includes(o.status) ? usd(o.amountCommitted, o.currency) : 0;
          entry.disbursedUsd += ["active", "won"].includes(o.status) ? usd(o.amountDisbursed, o.currency) : 0;
          if (CapitalOpportunity.SUCCESS.includes(o.outcome)) entry.financed += 1;
        }
      }

      breakdown = {
        groupBy: req.query.groupBy,
        label: group.label,
        rows: [...rows.values()]
          .map((entry) => ({ ...entry, requests: entry.requests.size, requestedUsd: round(entry.requestedUsd), committedUsd: round(entry.committedUsd), disbursedUsd: round(entry.disbursedUsd) }))
          .sort((a, b) => b.committedUsd - a.committedUsd || b.requests - a.requests),
      };
    }

    // Anza's contribution across successful financing.
    const contribution = CapitalOpportunity.CONTRIBUTIONS.map((key) => {
      const hits = won.filter((o) => (o.anzaContribution || []).includes(key));
      return { key, opportunities: hits.length, committedUsd: round(hits.reduce((t, o) => t + usd(o.amountCommitted, o.currency), 0)) };
    });

    successResponse(res, { totals, funnel, breakdown, contribution, groups: Object.entries(GROUPS).map(([key, value]) => ({ key, label: value.label })) });
  } catch (error) {
    errorResponse(res, error);
  }
};

// ---- Lists ------------------------------------------------------------------

const capitalFacilitated = async (req, res) => {
  try {
    const { where, include } = await opportunityQuery(req.query);
    where.outcome = { [Op.in]: CapitalOpportunity.SUCCESS };

    const rows = await CapitalOpportunity.findAll({ where, include, order: [["dateCommitted", "DESC"]] });
    const evidence = rows.length
      ? await CapitalDocument.findAll({ where: { capitalOpportunityId: { [Op.in]: rows.map((row) => row.id) }, deletedAt: null, category: { [Op.in]: ["signed_agreement", "term_sheet", "loan_agreement", "grant_agreement", "commitment_letter", "investor_confirmation", "bank_confirmation", "disbursement_evidence", "investment_agreement"] } }, attributes: ["capitalOpportunityId"], raw: true })
      : [];

    const programmes = await CohortProgram.findAll({ where: { id: { [Op.in]: [...new Set(rows.map((row) => row.CapitalRequest && row.CapitalRequest.cohortProgramId).filter(Boolean))] } }, attributes: ["id", "title"], raw: true });
    const programmeName = new Map(programmes.map((row) => [row.id, row.title]));

    const data = rows.map((row) => ({
      uuid: row.uuid,
      reference: row.reference,
      enterprise: shapeBusiness(row.Business),
      provider: row.CapitalProvider ? { uuid: row.CapitalProvider.uuid, name: row.CapitalProvider.name, providerType: row.CapitalProvider.providerType } : null,
      programme: row.CapitalRequest ? programmeName.get(row.CapitalRequest.cohortProgramId) || null : null,
      outcome: row.outcome,
      financingType: row.financingType,
      currency: row.currency,
      amountRequested: row.CapitalRequest ? row.CapitalRequest.amountRequested : null,
      amountApproved: row.amountApproved,
      amountCommitted: row.amountCommitted,
      amountDisbursed: row.amountDisbursed,
      committedUsd: usd(row.amountCommitted, row.currency),
      disbursedUsd: usd(row.amountDisbursed, row.currency),
      dateCommitted: row.dateCommitted,
      dateDisbursed: row.dateDisbursed,
      capitalSource: row.capitalSource,
      financingTerms: row.financingTerms,
      anzaContribution: row.anzaContribution,
      evidenceDocuments: evidence.filter((doc) => doc.capitalOpportunityId === row.id).length,
      assignedManager: row.assignedManager ? { uuid: row.assignedManager.uuid, name: row.assignedManager.name } : null,
    }));

    successResponse(res, {
      totals: {
        count: data.length,
        committedUsd: round(data.reduce((t, row) => t + row.committedUsd, 0)),
        disbursedUsd: round(data.reduce((t, row) => t + row.disbursedUsd, 0)),
        withoutEvidence: data.filter((row) => !row.evidenceDocuments).length,
      },
      data,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const enterprises = async (req, res) => {
  try {
    const { where, include } = await requestQuery(req.query);
    const requests = await CapitalRequest.findAll({ where, include, order: [["submittedAt", "DESC"]] });
    const opportunities = requests.length
      ? await CapitalOpportunity.findAll({ where: { capitalRequestId: { [Op.in]: requests.map((row) => row.id) } }, attributes: ["capitalRequestId", "businessId", "status", "outcome", "amountCommitted", "currency"], raw: true })
      : [];

    const byBusiness = new Map();
    for (const request of requests) {
      if (!request.Business) continue;
      const entry = byBusiness.get(request.businessId) || { enterprise: shapeBusiness(request.Business), programme: request.CohortProgram ? request.CohortProgram.title : null, requests: 0, requestedUsd: 0, latestStatus: request.status, latestRequest: request.uuid, activeOpportunities: 0, committedUsd: 0, financed: 0 };
      entry.requests += 1;
      entry.requestedUsd += usd(request.amountRequested, request.currency);
      byBusiness.set(request.businessId, entry);
    }
    for (const o of opportunities) {
      const entry = byBusiness.get(o.businessId);
      if (!entry) continue;
      if (o.status === "active") entry.activeOpportunities += 1;
      if (["active", "won"].includes(o.status)) entry.committedUsd += usd(o.amountCommitted, o.currency);
      if (CapitalOpportunity.SUCCESS.includes(o.outcome)) entry.financed += 1;
    }

    successResponse(res, { data: [...byBusiness.values()].map((entry) => ({ ...entry, requestedUsd: round(entry.requestedUsd), committedUsd: round(entry.committedUsd) })) });
  } catch (error) {
    errorResponse(res, error);
  }
};

const managers = async (req, res) => {
  try {
    const people = await User.findAll({ where: { role: CFM_ROLE, activated: true }, attributes: ["id", "uuid", "name", "email"], order: [["name", "ASC"]] });
    const [requests, opportunities] = await Promise.all([
      CapitalRequest.findAll({ where: { assignedManagerId: { [Op.in]: people.map((p) => p.id) }, status: { [Op.notIn]: ["declined", "closed", "disbursed", "fully_funded"] } }, attributes: ["assignedManagerId"], raw: true }),
      CapitalOpportunity.findAll({ where: { assignedManagerId: { [Op.in]: people.map((p) => p.id) }, status: "active" }, attributes: ["assignedManagerId"], raw: true }),
    ]);
    successResponse(res, {
      data: people.map((person) => ({
        uuid: person.uuid,
        name: person.name,
        email: person.email,
        openRequests: requests.filter((row) => row.assignedManagerId === person.id).length,
        activeOpportunities: opportunities.filter((row) => row.assignedManagerId === person.id).length,
      })),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Everything the filter bars and forms choose from, in one call.
const options = async (req, res) => {
  try {
    const [programmes, sectors, providers, people] = await Promise.all([
      CohortProgram.findAll({ where: { archivedAt: null }, attributes: ["uuid", "title"], order: [["title", "ASC"]] }),
      BusinessSector.findAll({ attributes: ["uuid", "name"], order: [["name", "ASC"]] }),
      CapitalProvider.findAll({ where: { status: "active" }, attributes: ["uuid", "name", "providerType"], order: [["name", "ASC"]] }),
      User.findAll({ where: { role: CFM_ROLE, activated: true }, attributes: ["uuid", "name"], order: [["name", "ASC"]] }),
    ]);

    successResponse(res, {
      programmes,
      sectors,
      providers,
      managers: people,
      financingTypes: CapitalRequest.FINANCING_TYPES,
      requestStatuses: CapitalRequest.STATUSES,
      readiness: CapitalRequest.READINESS,
      stages: STAGES,
      outcomes: CapitalOpportunity.OUTCOMES,
      contributions: CapitalOpportunity.CONTRIBUTIONS,
      modes: CapitalOpportunity.MODES,
      providerTypes: CapitalProvider.TYPES,
      appetites: CapitalProvider.APPETITES,
      introductionTypes: CapitalIntroduction.REQUEST_TYPES,
      introductionStatuses: CapitalIntroduction.STATUSES,
      documentCategories: CapitalDocument.CATEGORIES,
      documentVisibilities: CapitalDocument.VISIBILITIES,
      ddCategories: CapitalDdItem.CATEGORIES,
      ddStatuses: CapitalDdItem.STATUSES,
      ddParties: CapitalDdItem.PARTIES,
      ddRisks: CapitalDdItem.RISKS,
      interventions: CapitalIntervention.ACTIONS,
      matchableStatuses: MATCHABLE,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// ---- Audit trail ------------------------------------------------------------

const auditTrail = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
    const where = { module: "capital" };

    if (req.query.action) where.resourceType = { [Op.like]: `${req.query.action}%` };
    const range = dateRange(req.query);
    if (range) where.createdAt = range;
    if (req.query.user) {
      const user = await User.findOne({ where: { uuid: req.query.user }, attributes: ["id"] });
      where.userId = user ? user.id : -1;
    }
    if (req.query.opportunity) {
      const opportunity = await CapitalOpportunity.findOne({ where: { uuid: req.query.opportunity }, attributes: ["id"] });
      where.capitalOpportunityId = opportunity ? opportunity.id : -1;
    }

    const { count, rows } = await Log.findAndCountAll({
      where,
      include: [{ model: User, attributes: ["uuid", "name"] }],
      order: [["createdAt", "DESC"], ["id", "DESC"]],
      limit,
      offset: (page - 1) * limit,
    });

    const opportunityIds = [...new Set(rows.map((row) => row.capitalOpportunityId).filter(Boolean))];
    const refs = opportunityIds.length ? await CapitalOpportunity.findAll({ where: { id: { [Op.in]: opportunityIds } }, attributes: ["id", "uuid", "reference"], raw: true }) : [];
    const refOf = new Map(refs.map((row) => [row.id, row]));

    successResponse(res, {
      count,
      page,
      totalPages: Math.ceil(count / limit),
      data: rows.map((row) => ({
        uuid: row.uuid,
        action: row.action,
        actionKey: row.resourceType,
        user: row.User,
        role: row.role,
        opportunity: refOf.get(row.capitalOpportunityId) ? { uuid: refOf.get(row.capitalOpportunityId).uuid, reference: refOf.get(row.capitalOpportunityId).reference } : null,
        oldValue: row.oldValue,
        newValue: row.newValue,
        metadata: row.metadata,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        createdAt: row.createdAt,
      })),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// ---- Notifications ------------------------------------------------------------

const notifications = async (req, res) => {
  try {
    const role = await roleOf(req);
    const rows = await Notification.findAll({
      where: { type: { [Op.like]: "capital.%" }, [Op.or]: [{ userId: req.user.id }, { to: role }] },
      order: [["createdAt", "DESC"]],
      limit: Math.min(500, Number(req.query.limit) || 200),
    });

    let seen = new Set();
    if (rows.length && NotificationViewer) {
      const viewers = await NotificationViewer.findAll({
        where: { userId: req.user.id, notificationId: { [Op.in]: [...rows.map((row) => row.uuid), ...rows.map((row) => String(row.id))] } },
        attributes: ["notificationId"],
        raw: true,
      }).catch(() => []);
      seen = new Set(viewers.map((row) => String(row.notificationId)));
    }

    const data = rows.map((row) => ({ uuid: row.uuid, type: row.type, message: row.message, link: row.link, createdAt: row.createdAt, read: seen.has(row.uuid) || seen.has(String(row.id)) }));
    successResponse(res, { unread: data.filter((row) => !row.read).length, data });
  } catch (error) {
    errorResponse(res, error);
  }
};

// ---- Settings ----------------------------------------------------------------

const SETTING_RULES = {
  staleOpportunityDays: { min: 1, max: 365, label: "Days without activity before an opportunity is flagged" },
  meetingReminderHours: { min: 1, max: 168, label: "Hours before a meeting to send a reminder" },
};

const readSettings = async () => {
  const rows = await CapitalSetting.findAll({ raw: true });
  const stored = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return Object.entries(SETTING_RULES).map(([key, rule]) => ({ key, ...rule, value: Number(stored[key] ?? CapitalSetting.DEFAULTS[key]) }));
};

const getSettings = async (req, res) => {
  try {
    successResponse(res, { data: await readSettings() });
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateSettings = async (req, res) => {
  try {
    const changes = [];
    for (const [key, rule] of Object.entries(SETTING_RULES)) {
      if (req.body[key] === undefined) continue;
      const value = Number(req.body[key]);
      if (!Number.isInteger(value) || value < rule.min || value > rule.max) return fail(res, 400, `${rule.label} must be a whole number from ${rule.min} to ${rule.max}`);
      changes.push([key, value]);
    }
    if (!changes.length) return fail(res, 400, "Nothing to update");

    const before = Object.fromEntries((await readSettings()).map((row) => [row.key, row.value]));
    for (const [key, value] of changes) {
      const [row] = await CapitalSetting.findOrCreate({ where: { key }, defaults: { key, value: String(value), updatedById: req.user.id } });
      await row.update({ value: String(value), updatedById: req.user.id });
    }

    await audit(req, {
      action: "Changed capital facilitation settings",
      actionKey: "settings.updated",
      entity: { type: "capital_settings" },
      oldValue: Object.fromEntries(changes.map(([key]) => [key, before[key]])),
      newValue: Object.fromEntries(changes),
    }, { strict: true });

    successResponse(res, { data: await readSettings() });
  } catch (error) {
    errorResponse(res, error);
  }
};

// ---- Permission matrix -----------------------------------------------------------

// The roles an administrator may grant capital permissions to. External roles
// are deliberately absent: enterprises and providers reach capital data only
// through their own endpoints, never through a grant.
const GRANTABLE_ROLES = ["CFM", "Admin", "BDA", "ME", "Finance"];

const permissionMatrix = async (req, res) => {
  try {
    const [permissions, grants] = await Promise.all([
      Permission.findAll({ where: { module: "capital" }, attributes: ["id", "key", "description"], order: [["key", "ASC"]] }),
      RolePermission.findAll({ attributes: ["role", "permissionId"], raw: true }),
    ]);

    successResponse(res, {
      roles: GRANTABLE_ROLES,
      data: permissions.map((permission) => ({
        key: permission.key,
        description: permission.description,
        roles: GRANTABLE_ROLES.filter((role) => grants.some((grant) => grant.role === role && grant.permissionId === permission.id)),
      })),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const setPermission = async (req, res) => {
  try {
    const { role, key, granted } = req.body;
    if (!GRANTABLE_ROLES.includes(role)) return fail(res, 400, `Role must be one of ${GRANTABLE_ROLES.join(", ")}`);

    const permission = await Permission.findOne({ where: { key, module: "capital" } });
    if (!permission) return fail(res, 404, "Permission not found");

    // Nobody can lock the administrators out of the matrix itself.
    if (role === "Admin" && key === "capital.permissions.manage" && granted === false) {
      return fail(res, 409, "Administrators must keep the ability to manage capital permissions");
    }

    const existing = await RolePermission.findOne({ where: { role, permissionId: permission.id } });
    if (granted && !existing) await RolePermission.create({ role, permissionId: permission.id });
    if (!granted && existing) await existing.destroy();

    if (!!existing !== !!granted) {
      await audit(req, {
        action: `${granted ? "Granted" : "Revoked"} ${key} ${granted ? "to" : "from"} ${role}`,
        actionKey: "permissions.changed",
        entity: { type: "role_permission" },
        oldValue: { role, key, granted: !!existing },
        newValue: { role, key, granted: !!granted },
      }, { strict: true });
    }

    successResponse(res, { role, key, granted: !!granted });
  } catch (error) {
    errorResponse(res, error);
  }
};

// What the signed-in user may do, for the frontend to show or hide actions.
const myPermissions = async (req, res) => {
  try {
    const { permissionsOf } = require("../../utils/capital_access");
    successResponse(res, { role: await roleOf(req), permissions: [...(await permissionsOf(req))].sort() });
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  dashboard,
  reports,
  capitalFacilitated,
  enterprises,
  managers,
  options,
  auditTrail,
  notifications,
  getSettings,
  updateSettings,
  permissionMatrix,
  setPermission,
  myPermissions,
};
