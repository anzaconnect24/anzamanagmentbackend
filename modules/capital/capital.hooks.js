// Bringing the platform's existing investment flows into capital facilitation.
//
// The older investment request and investor interest features stay as they
// are; each record they create is mirrored here, so it lands in the Capital
// Facilitation Manager's queue instead of going straight between the parties.
// A mirror failure is logged and never breaks the original action.
//
// Controllers are required lazily: these hooks are loaded by older modules at
// start-up, before the capital module has necessarily been loaded.
const {
  Business,
  CapitalIntroduction,
  CapitalRequest,
  CohortMembership,
  User,
} = require("../../models");
const { audit } = require("../../utils/capital_audit");
const { notifyManagers } = require("../../utils/capital_notify");
const { toUsd } = require("../../utils/capital_match");
const { createWithReference } = require("../../utils/capital_reference");

const financingTypeFrom = (text) => {
  const value = String(text || "").toLowerCase();
  if (value.includes("grant")) return "grant";
  if (value.includes("convertible") || value.includes("safe")) return "convertible";
  if (value.includes("debt") || value.includes("loan")) return "debt";
  if (value.includes("equity")) return "equity";
  if (value.includes("revenue")) return "revenue_based";
  if (value.includes("working capital")) return "working_capital";
  return "other";
};

// The older tables store business and user ids as strings, sometimes a uuid.
const findBusiness = (value) =>
  /^\d+$/.test(String(value))
    ? Business.findByPk(Number(value))
    : Business.findOne({ where: { uuid: String(value) } });

/**
 * An investment request (BusinessInvestmentRequest) becomes a capital request
 * waiting for review. Idempotent: a request is mirrored once.
 */
const mirrorInvestmentRequest = async (req, investmentRequest, { notifyManager = true } = {}) => {
  try {
    if (!investmentRequest) return null;

    const existing = await CapitalRequest.findOne({ where: { legacyRequestId: investmentRequest.id } });
    if (existing) return existing;

    const business = await findBusiness(investmentRequest.businessId);
    if (!business) return null;

    const membership = await CohortMembership.findOne({ where: { businessId: business.id }, order: [["createdAt", "DESC"]], attributes: ["cohortProgramId"] });
    const amount = Number(investmentRequest.investmentAmount) > 0 ? Number(investmentRequest.investmentAmount) : null;
    const currency = String(investmentRequest.currency || "USD").toUpperCase().slice(0, 8);

    const request = await createWithReference(CapitalRequest, "CR", {
      businessId: business.id,
      userId: Number(investmentRequest.userId) || business.userId,
      cohortProgramId: membership ? membership.cohortProgramId : null,
      legacyRequestId: investmentRequest.id,
      amountRequested: amount,
      currency,
      amountUsd: amount ? toUsd(amount, currency) : null,
      financingType: financingTypeFrom(investmentRequest.investmentType),
      purpose: [
        investmentRequest.helpFromAnza ? `Help wanted from Anza: ${investmentRequest.helpFromAnza}` : null,
        investmentRequest.additionalInfo || null,
      ].filter(Boolean).join("\n\n") || null,
      status: "submitted",
      submittedAt: investmentRequest.createdAt || new Date(),
    });

    await audit(req, {
      action: `Capital request ${request.reference} created from investment request ${investmentRequest.uuid}`,
      actionKey: "request.mirrored",
      entity: { type: "capital_request", id: request.id, uuid: request.uuid },
      businessId: business.id,
      newValue: { legacyRequest: investmentRequest.uuid, amountRequested: amount, currency },
    });

    if (notifyManager) {
      await notifyManagers({ type: "capital.request.submitted", message: `New capital request ${request.reference} from ${business.name}`, link: `/dashboard/capital/requests/${request.uuid}` });
    }

    return request;
  } catch (error) {
    console.error("Mirroring investment request into capital facilitation failed:", error.message);
    return null;
  }
};

/**
 * An investor's interest in a business (InvestmentInterest) becomes a provider
 * introduction request waiting for the manager's review. Idempotent.
 */
const mirrorInvestmentInterest = async (req, interest, business, { notifyManager = true } = {}) => {
  try {
    if (!interest || !business) return null;

    const existing = await CapitalIntroduction.findOne({ where: { legacyInterestId: interest.id } });
    if (existing) return existing;

    const { myProvider } = require("./capital.shared");
    const { createProviderInterest } = require("./capital.introductions.controller");

    const investor = await User.findByPk(interest.userId, { attributes: ["id", "role", "name"] });
    if (!investor || investor.role !== "Investor") return null;

    const provider = await myProvider(investor);
    if (!provider) return null;

    const { introduction, error } = await createProviderInterest({
      req: { ...req, user: { id: investor.id, role: investor.role } },
      provider,
      business,
      requestType: "introduction",
      legacyInterestId: interest.id,
    });
    if (error) return null;

    await audit(req, {
      action: `${provider.name}'s interest in ${business.name} placed in the introduction queue`,
      actionKey: "introduction.mirrored",
      entity: { type: "capital_introduction", id: introduction.id, uuid: introduction.uuid },
      businessId: business.id,
      providerId: provider.id,
      newValue: { legacyInterest: interest.uuid },
    });

    if (notifyManager) {
      await notifyManagers({ type: "capital.provider.interest", message: `${provider.name} expressed interest in ${business.name}`, link: "/dashboard/capital/introductions" });
    }

    return introduction;
  } catch (error) {
    console.error("Mirroring investor interest into capital facilitation failed:", error.message);
    return null;
  }
};

module.exports = { mirrorInvestmentRequest, mirrorInvestmentInterest, financingTypeFrom };
