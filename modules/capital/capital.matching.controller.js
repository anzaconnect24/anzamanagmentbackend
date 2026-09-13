// Capital Matching: which capital providers suit an enterprise's request, and
// turning a chosen provider into a Capital Opportunity.
const { Op } = require("sequelize");
const {
  Business,
  BusinessSector,
  CapitalIntroduction,
  CapitalNote,
  CapitalOpportunity,
  CapitalProvider,
  CapitalRequest,
  User,
  sequelize,
} = require("../../models");
const { errorResponse, successResponse } = require("../../utils/responses");
const { audit } = require("../../utils/capital_audit");
const { can } = require("../../utils/capital_access");
const { notify } = require("../../utils/capital_notify");
const { scoreMatch } = require("../../utils/capital_match");
const { createWithReference } = require("../../utils/capital_reference");
const { STAGE_PROBABILITY } = require("../../utils/capital_rules");
const {
  enterpriseProfile,
  fail,
  shapeBusiness,
  shapeProvider,
  syncRequestStatus,
  touch,
} = require("./capital.shared");

// A request is only matched once the manager has approved it; after that it
// stays on the matching page for as long as capital is still being pursued.
const MATCHABLE = [
  "approved_for_matching",
  "matching_in_progress",
  "capital_provider_identified",
  "introduction_pending",
  "introduction_approved",
  "capital_provider_engaged",
  "due_diligence",
  "negotiation",
  "partially_funded",
];

const withBusiness = [{ model: Business, include: [{ model: BusinessSector, attributes: ["name"] }] }];

const scoreAll = (request, providers) => {
  const enterprise = enterpriseProfile(request.Business, request);
  return providers
    .map((provider) => ({ provider, result: scoreMatch({ enterprise, request, provider: provider.toJSON() }) }))
    .sort((a, b) => b.result.score - a.result.score);
};

// The Capital Matching table.
const matchingTable = async (req, res) => {
  try {
    const where = { status: { [Op.in]: MATCHABLE } };
    if (req.query.status) where.status = req.query.status;
    if (req.query.financingType) where.financingType = req.query.financingType;

    const [requests, providers] = await Promise.all([
      CapitalRequest.findAll({
        where,
        include: [...withBusiness, { model: User, as: "assignedManager", attributes: ["uuid", "name"] }],
        order: [["submittedAt", "ASC"]],
      }),
      CapitalProvider.findAll({ where: { status: "active" } }),
    ]);

    const opportunities = requests.length
      ? await CapitalOpportunity.findAll({ where: { capitalRequestId: { [Op.in]: requests.map((row) => row.id) } }, attributes: ["capitalRequestId", "status"], raw: true })
      : [];

    const data = requests
      .filter((request) => !req.query.sector || (request.Business && request.Business.BusinessSector && request.Business.BusinessSector.name === req.query.sector))
      .map((request) => {
        const ranked = scoreAll(request, providers);
        const mine = opportunities.filter((row) => row.capitalRequestId === request.id);
        return {
          uuid: request.uuid,
          reference: request.reference,
          enterprise: shapeBusiness(request.Business),
          capitalRequired: request.amountRequested,
          currency: request.currency,
          financingType: request.financingType,
          readinessStatus: request.readinessStatus,
          recommendedProviders: ranked.slice(0, 3).map(({ provider, result }) => ({ uuid: provider.uuid, name: provider.name, score: result.score })),
          highestMatchScore: ranked.length ? ranked[0].result.score : null,
          assignedManager: request.assignedManager ? { uuid: request.assignedManager.uuid, name: request.assignedManager.name } : null,
          status: request.status,
          activeOpportunities: mine.filter((row) => row.status === "active").length,
          totalOpportunities: mine.length,
        };
      });

    successResponse(res, { count: data.length, data });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Every active provider scored against one request: Manage Matching.
const recommendations = async (req, res) => {
  try {
    const request = await CapitalRequest.findOne({ where: { uuid: req.params.uuid }, include: withBusiness });
    if (!request) return fail(res, 404, "Capital request not found");

    const filter = { status: "active" };
    if (req.query.type) filter.providerType = req.query.type;

    const [providers, existing] = await Promise.all([
      CapitalProvider.findAll({ where: filter }),
      CapitalOpportunity.findAll({ where: { capitalRequestId: request.id }, attributes: ["uuid", "reference", "capitalProviderId", "stage", "status", "outcome"], raw: true }),
    ]);

    const reveal = await can(req, "capital.providers.manage");
    const minScore = Number(req.query.minScore) || 0;

    successResponse(res, {
      request: {
        uuid: request.uuid,
        reference: request.reference,
        status: request.status,
        amountRequested: request.amountRequested,
        currency: request.currency,
        amountUsd: request.amountUsd,
        financingType: request.financingType,
        readinessStatus: request.readinessStatus,
        preferredProviderTypes: request.preferredProviderTypes,
        matchable: MATCHABLE.includes(request.status),
        enterprise: shapeBusiness(request.Business),
      },
      data: scoreAll(request, providers)
        .filter(({ result }) => result.score >= minScore)
        .map(({ provider, result }) => {
          const opportunity = existing.find((row) => row.capitalProviderId === provider.id) || null;
          return {
            provider: shapeProvider(provider, { revealContacts: reveal }),
            score: result.score,
            strength: result.strength,
            breakdown: result.breakdown,
            explanation: result.explanation,
            opportunity: opportunity && { uuid: opportunity.uuid, reference: opportunity.reference, stage: opportunity.stage, status: opportunity.status, outcome: opportunity.outcome },
          };
        }),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Choose a provider for a request, creating the Capital Opportunity. The
// engine's score is always recorded; choosing a provider it ranked below
// another is an override, and needs a reason.
const selectProvider = async (req, res) => {
  const transaction = await sequelize.transaction();
  const refuse = async (code, message) => {
    await transaction.rollback();
    return fail(res, code, message);
  };

  try {
    const { providerUuid, overrideReason, potentialAmount, createIntroduction, introductionMessage } = req.body;

    const request = await CapitalRequest.findOne({ where: { uuid: req.params.uuid }, include: withBusiness, transaction });
    if (!request) return refuse(404, "Capital request not found");
    if (!MATCHABLE.includes(request.status)) return refuse(409, "Approve the request for matching before selecting capital providers");

    const provider = await CapitalProvider.findOne({ where: { uuid: providerUuid, status: "active" }, transaction });
    if (!provider) return refuse(404, "Capital provider not found or inactive");

    const duplicate = await CapitalOpportunity.findOne({ where: { capitalRequestId: request.id, capitalProviderId: provider.id }, transaction });
    if (duplicate) return refuse(409, `${provider.name} is already an opportunity on this request (${duplicate.reference})`);

    // Was a better-scoring provider passed over?
    const providers = await CapitalProvider.findAll({ where: { status: "active" }, transaction });
    const ranked = scoreAll(request, providers);
    const chosen = ranked.find((row) => row.provider.id === provider.id);
    const taken = new Set((await CapitalOpportunity.findAll({ where: { capitalRequestId: request.id }, attributes: ["capitalProviderId"], raw: true, transaction })).map((row) => row.capitalProviderId));
    const bestAvailable = ranked.find((row) => !taken.has(row.provider.id));
    const override = !!bestAvailable && bestAvailable.provider.id !== provider.id && bestAvailable.result.score > chosen.result.score;

    if (override && !String(overrideReason || "").trim()) {
      return refuse(400, `${bestAvailable.provider.name} scores higher (${bestAvailable.result.score}% vs ${chosen.result.score}%). Give a reason for choosing ${provider.name} instead.`);
    }

    let amount = request.amountRequested;
    if (potentialAmount !== undefined && potentialAmount !== "" && potentialAmount !== null) {
      if (!Number.isFinite(Number(potentialAmount)) || Number(potentialAmount) <= 0) return refuse(400, "Potential financing must be a positive number");
      amount = Number(potentialAmount);
    }

    const introduce = createIntroduction === true;
    const stage = introduce ? "introduction" : "matching";

    const opportunity = await createWithReference(CapitalOpportunity, "CAP", {
      capitalRequestId: request.id,
      capitalProviderId: provider.id,
      businessId: request.businessId,
      stage,
      probability: STAGE_PROBABILITY[stage],
      matchScore: chosen.result.score,
      matchBreakdown: chosen.result.breakdown,
      matchExplanation: chosen.result.explanation,
      potentialAmount: amount,
      currency: request.currency,
      financingType: request.financingType,
      assignedManagerId: request.assignedManagerId || req.user.id,
      lastActivityAt: new Date(),
      communicationMode: "moderated",
      nextAction: introduce ? "Follow up on the introduction with the capital provider" : "Decide whether to introduce the enterprise",
    }, { transaction });

    if (override) {
      await CapitalNote.create({
        subjectType: "opportunity",
        subjectId: opportunity.id,
        body: `Manual override: chose ${provider.name} (${chosen.result.score}%) over ${bestAvailable.provider.name} (${bestAvailable.result.score}%). Reason: ${String(overrideReason).trim()}`,
        authorId: req.user.id,
      }, { transaction });
    }

    // A manager-made introduction is approved as it is made: the manager is
    // the gatekeeper whose approval the introduction needs.
    if (introduce) {
      await CapitalIntroduction.create({
        capitalOpportunityId: opportunity.id,
        capitalRequestId: request.id,
        businessId: request.businessId,
        capitalProviderId: provider.id,
        initiatedBy: "manager",
        requestedById: req.user.id,
        requestType: "introduction",
        message: introductionMessage || null,
        status: "approved",
        reviewedById: req.user.id,
        reviewedAt: new Date(),
      }, { transaction });
      await opportunity.update({ introductionApprovedAt: new Date() }, { transaction });
    }

    await transaction.commit();

    await audit(req, {
      action: `Selected ${provider.name} for ${request.reference}, creating ${opportunity.reference}${override ? " (manual override)" : ""}${introduce ? " and approved the introduction" : ""}`,
      actionKey: override ? "matching.override" : "matching.selected",
      entity: { type: "capital_opportunity", id: opportunity.id, uuid: opportunity.uuid },
      opportunity,
      newValue: { provider: provider.name, matchScore: chosen.result.score, stage, potentialAmount: amount },
      details: override ? { overriddenProvider: bestAvailable.provider.name, overriddenScore: bestAvailable.result.score, reason: overrideReason } : undefined,
    });

    await syncRequestStatus(req, request.id);
    if (request.status === "approved_for_matching") {
      await request.update({ status: introduce ? "introduction_approved" : "capital_provider_identified" });
    }

    if (introduce) {
      if (request.Business && request.Business.userId) {
        await notify({ userIds: [request.Business.userId], type: "capital.introduction.approved", message: `Anza has introduced you to ${provider.name} (${opportunity.reference})`, link: "/dashboard/capital" });
      }
      if (provider.userId) {
        await notify({ userIds: [provider.userId], type: "capital.introduction.approved", message: `Anza has introduced you to ${request.Business.name} (${opportunity.reference})`, link: "/dashboard/capital-deals" });
      }
    }

    successResponse(res, { uuid: opportunity.uuid, reference: opportunity.reference, matchScore: opportunity.matchScore, override, stage });
  } catch (error) {
    await transaction.rollback();
    errorResponse(res, error);
  }
};

// What a provider said back, recorded by the manager.
const RESPONSES = ["interested", "declined", "requested_information", "no_response"];

const recordProviderResponse = async (req, res) => {
  try {
    const { response, note } = req.body;
    if (!RESPONSES.includes(response)) return fail(res, 400, `Response must be one of ${RESPONSES.join(", ")}`);

    const opportunity = await CapitalOpportunity.findOne({
      where: { uuid: req.params.uuid },
      include: [{ model: CapitalProvider, attributes: ["id", "name"] }, { model: Business, attributes: ["id", "name", "userId"] }],
    });
    if (!opportunity) return fail(res, 404, "Capital opportunity not found");
    if (opportunity.status !== "active") return fail(res, 409, "This opportunity is closed");

    const before = { stage: opportunity.stage, status: opportunity.status, outcome: opportunity.outcome };
    const values = { lastActivityAt: new Date() };

    if (response === "interested") {
      if (!opportunity.introductionApprovedAt) return fail(res, 409, "Approve the introduction before recording the provider's interest");
      values.stage = "provider_interest";
      values.probability = Math.max(opportunity.probability || 0, STAGE_PROBABILITY.provider_interest);
      values.nextAction = "Arrange an initial meeting";
    } else if (response === "declined") {
      Object.assign(values, { status: "lost", outcome: "declined_by_provider", closedAt: new Date(), closedReason: note || "Declined by the capital provider", probability: 0 });
    } else if (response === "requested_information") {
      values.nextAction = note ? `Provider asked: ${String(note).slice(0, 200)}` : "Send the information the provider asked for";
    } else {
      values.nextAction = "Chase the capital provider for a response";
    }

    await opportunity.update(values);

    await audit(req, {
      action: `Recorded ${opportunity.CapitalProvider.name}'s response on ${opportunity.reference}: ${response.replace(/_/g, " ")}`,
      actionKey: "opportunity.provider_response",
      entity: { type: "capital_opportunity", id: opportunity.id, uuid: opportunity.uuid },
      opportunity,
      oldValue: before,
      newValue: { stage: opportunity.stage, status: opportunity.status, outcome: opportunity.outcome },
      details: note ? { note } : undefined,
    });

    await syncRequestStatus(req, opportunity.capitalRequestId);

    if (["interested", "declined"].includes(response) && opportunity.Business.userId) {
      await notify({
        userIds: [opportunity.Business.userId],
        type: `capital.provider.${response}`,
        message: response === "interested" ? `${opportunity.CapitalProvider.name} is interested in your enterprise (${opportunity.reference})` : `${opportunity.CapitalProvider.name} has declined (${opportunity.reference})`,
        link: "/dashboard/capital",
      });
    }

    successResponse(res, { uuid: opportunity.uuid, stage: opportunity.stage, status: opportunity.status, outcome: opportunity.outcome });
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  MATCHABLE,
  matchingTable,
  recommendations,
  selectProvider,
  recordProviderResponse,
};
