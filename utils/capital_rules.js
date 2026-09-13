// Business rules for moving capital work forward.
const { CapitalOpportunity } = require("../models");

const STAGES = CapitalOpportunity.STAGES;
const stageIndex = (stage) => STAGES.indexOf(stage);

// A default likelihood of closing at each stage, used until the manager sets
// their own.
const STAGE_PROBABILITY = {
  capital_request: 5,
  manager_review: 5,
  capital_ready: 10,
  matching: 10,
  introduction: 15,
  provider_interest: 25,
  initial_meeting: 35,
  due_diligence: 50,
  provider_review: 60,
  negotiation: 70,
  term_sheet: 80,
  commitment: 90,
  disbursement: 95,
  capital_secured: 100,
  post_financing: 100,
};

// What an opportunity's stage says about its request. A request follows its
// most advanced opportunity, never moving backwards because a second provider
// is at an earlier stage.
const REQUEST_STATUS_FOR_STAGE = {
  matching: "matching_in_progress",
  introduction: "introduction_pending",
  provider_interest: "capital_provider_engaged",
  initial_meeting: "capital_provider_engaged",
  due_diligence: "due_diligence",
  provider_review: "due_diligence",
  negotiation: "negotiation",
  term_sheet: "negotiation",
  commitment: "commitment_secured",
  disbursement: "commitment_secured",
  capital_secured: "fully_funded",
  post_financing: "disbursed",
};

// Every stage past this one needs the manager to have approved an introduction:
// the rule that stops an enterprise and provider bypassing Anza.
const INTRODUCTION_GATE = "provider_interest";

/**
 * Why an opportunity may not move to a stage. Returns [] when it may.
 * `values` are amounts supplied with the move, checked as if already saved.
 */
const stageMoveErrors = (opportunity, target, values = {}) => {
  const errors = [];
  const merged = { ...opportunity, ...values };

  if (!STAGES.includes(target)) {
    errors.push(`"${target}" is not a pipeline stage`);
    return errors;
  }

  if (opportunity.status !== "active") {
    errors.push("A closed opportunity cannot be moved; reopen it first");
  }

  if (stageIndex(target) >= stageIndex(INTRODUCTION_GATE) && !merged.introductionApprovedAt) {
    errors.push("An introduction must be approved before the provider can engage");
  }

  const committed = Number(merged.amountCommitted) > 0;
  const disbursed = Number(merged.amountDisbursed) > 0;

  if (stageIndex(target) >= stageIndex("commitment") && !committed) {
    errors.push("Record the amount committed before moving to Commitment or beyond");
  }
  if (["capital_secured", "post_financing"].includes(target) && !merged.dateCommitted) {
    errors.push("Record the date of commitment before marking capital secured");
  }
  if (target === "post_financing" && !disbursed) {
    errors.push("Record the amount disbursed before post-financing monitoring");
  }

  return errors;
};

// The request's status given all its opportunities.
const requestStatusFrom = (opportunities, current) => {
  const active = opportunities.filter((row) => row.status === "active" || row.status === "won");
  if (!active.length) return current;

  const furthest = active.reduce((best, row) =>
    stageIndex(row.stage) > stageIndex(best.stage) ? row : best,
  );

  let status = REQUEST_STATUS_FOR_STAGE[furthest.stage] || current;

  if (furthest.stage === "capital_secured") {
    const partial = active.some((row) => row.outcome === "partially_secured");
    status = partial ? "partially_funded" : "fully_funded";
  }

  return status;
};

// The standard checklist a manager can apply to an opportunity in one step.
const DUE_DILIGENCE_TEMPLATE = [
  ["business", "Company profile and business model overview", "enterprise"],
  ["financial", "Audited or management financial statements (last 2-3 years)", "enterprise"],
  ["financial", "Financial model and projections", "enterprise"],
  ["legal", "Certificate of incorporation and business licence", "enterprise"],
  ["legal", "Material contracts and litigation disclosure", "enterprise"],
  ["tax", "Tax clearance certificate and TIN registration", "enterprise"],
  ["governance", "Board composition and shareholding structure", "enterprise"],
  ["management", "Management team CVs and key-person dependencies", "enterprise"],
  ["market", "Market size, customers and competitor analysis", "enterprise"],
  ["operations", "Operational processes, suppliers and capacity", "enterprise"],
  ["impact", "Impact metrics and theory of change", "enterprise"],
  ["esg", "ESG policies and environmental and social risk screening", "anza"],
  ["compliance", "KYC / AML checks on founders and shareholders", "provider"],
  ["financing_readiness", "Use of funds and repayment or exit plan", "enterprise"],
];

module.exports = {
  STAGES,
  stageIndex,
  STAGE_PROBABILITY,
  REQUEST_STATUS_FOR_STAGE,
  INTRODUCTION_GATE,
  stageMoveErrors,
  requestStatusFrom,
  DUE_DILIGENCE_TEMPLATE,
};
