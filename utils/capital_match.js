// The capital provider matching engine.
//
// Scores an enterprise's capital request against a capital provider on seven
// weighted criteria and explains the result in words. It recommends; the
// Capital Facilitation Manager decides, and can pick a provider the engine
// ranked low.
//
// A criterion the provider has not stated scores a neutral 50 rather than 0 or
// 100: an empty preference is unknown, not a mismatch and not a guarantee.

// Indicative rates for comparing ticket sizes across currencies. Good enough to
// rank; never used to report money, which stays in its own currency.
const USD_RATE = {
  USD: 1,
  TZS: 1 / 2600,
  KES: 1 / 129,
  UGX: 1 / 3700,
  RWF: 1 / 1400,
  ZAR: 1 / 18.5,
  EUR: 1.08,
  GBP: 1.27,
};

const toUsd = (amount, currency = "USD") => {
  const value = Number(amount);
  if (!Number.isFinite(value)) return null;
  const rate = USD_RATE[String(currency || "USD").toUpperCase()];
  return rate ? Math.round(value * rate * 100) / 100 : value;
};

const norm = (value) => String(value || "").trim().toLowerCase();
const list = (value) => (Array.isArray(value) ? value : value ? [value] : []).map(norm).filter(Boolean);
const money = (value) => `USD ${Math.round(Number(value) || 0).toLocaleString("en-US")}`;
const human = (value) => String(value || "").replace(/_/g, " ");

// Enterprises on the platform are Tanzanian, so a Tanzanian location also sits
// inside every wider region a provider might name.
const REGION_TOKENS = ["tanzania", "east africa", "eastern africa", "eac", "sadc", "africa", "sub-saharan africa", "global", "worldwide", "emerging markets"];

const WEIGHTS = {
  sector: 20,
  geography: 15,
  ticket: 20,
  stage: 10,
  impact: 10,
  readiness: 15,
  criteria: 10,
};

const LABELS = {
  sector: "Sector Match",
  geography: "Geographic Match",
  ticket: "Ticket Size Match",
  stage: "Enterprise Stage Match",
  impact: "Impact Theme Match",
  readiness: "Financial Readiness",
  criteria: "Provider Criteria Match",
};

const READINESS_SCORE = {
  not_assessed: 40,
  not_ready: 15,
  emerging: 50,
  ready: 80,
  investment_ready: 100,
};

const overlaps = (a, b) => a.some((x) => b.some((y) => x.includes(y) || y.includes(x)));

/**
 * enterprise: { sector, location, stage, revenueUsd, impactText, founderGender, youthLed }
 * request:    { amountUsd, financingType, readinessStatus }
 * provider:   CapitalProvider (plain object)
 */
const scoreMatch = ({ enterprise, request, provider, now = new Date() }) => {
  const parts = {};
  const strengths = [];
  const gaps = [];

  // Sector
  const sectors = list(provider.preferredSectors);
  const sector = norm(enterprise.sector);
  if (!sectors.length) parts.sector = [50, "The provider has not stated sector preferences"];
  else if (sector && overlaps(sectors, [sector])) {
    parts.sector = [100, `Targets ${enterprise.sector} enterprises`];
    strengths.push(`targets ${enterprise.sector} enterprises`);
  } else {
    parts.sector = [0, `Does not list ${enterprise.sector || "this sector"}`];
    gaps.push(`the provider does not list ${enterprise.sector || "this sector"}`);
  }

  // Geography
  const geographies = list(provider.preferredGeographies);
  const place = [norm(enterprise.location), ...REGION_TOKENS].filter(Boolean);
  if (!geographies.length) parts.geography = [50, "No geographic preference stated"];
  else if (overlaps(geographies, place)) {
    const matched = provider.preferredGeographies.find((g) => overlaps([norm(g)], place));
    parts.geography = [100, `Invests in ${matched}`];
    strengths.push(`invests in ${matched}`);
  } else {
    parts.geography = [0, `Focuses on ${provider.preferredGeographies.join(", ")}`];
    gaps.push(`the provider focuses on ${provider.preferredGeographies.join(", ")}`);
  }

  // Ticket size
  const amount = Number(request.amountUsd);
  const min = provider.minTicketUsd === null || provider.minTicketUsd === undefined ? null : Number(provider.minTicketUsd);
  const max = provider.maxTicketUsd === null || provider.maxTicketUsd === undefined ? null : Number(provider.maxTicketUsd);
  if (!Number.isFinite(amount) || amount <= 0 || (min === null && max === null)) {
    parts.ticket = [50, "Ticket size could not be compared"];
  } else if ((min === null || amount >= min) && (max === null || amount <= max)) {
    const range = min !== null && max !== null ? `between ${money(min)} and ${money(max)}` : min !== null ? `from ${money(min)}` : `up to ${money(max)}`;
    parts.ticket = [100, `Finances ${range}`];
    strengths.push(`provides financing ${range}`);
  } else {
    const ratio = min !== null && amount < min ? amount / min : max / amount;
    const score = ratio >= 0.75 ? 70 : ratio >= 0.5 ? 40 : 0;
    const where = min !== null && amount < min ? `below the ${money(min)} minimum` : `above the ${money(max)} maximum`;
    parts.ticket = [score, `The request of ${money(amount)} is ${where}`];
    gaps.push(`the request is ${where}`);
  }

  // Enterprise stage
  const stages = list(provider.enterpriseStages);
  const stage = norm(enterprise.stage);
  if (!stages.length) parts.stage = [50, "No stage preference stated"];
  else if (stage && overlaps(stages, [stage])) {
    parts.stage = [100, `Backs ${enterprise.stage}-stage enterprises`];
    strengths.push(`backs ${enterprise.stage}-stage enterprises`);
  } else {
    parts.stage = [0, `Prefers ${provider.enterpriseStages.join(", ")} stage`];
    gaps.push(`the provider prefers ${provider.enterpriseStages.join(", ")}-stage enterprises`);
  }

  // Impact themes
  const themes = list(provider.impactThemes);
  const impactText = norm(enterprise.impactText);
  if (!themes.length) parts.impact = [50, "No impact themes stated"];
  else {
    const hit = provider.impactThemes.filter((theme) => impactText.includes(norm(theme)));
    if (hit.length) {
      parts.impact = [100, `Shares impact themes: ${hit.join(", ")}`];
      strengths.push(`prioritises ${hit.join(", ")} impact`);
    } else {
      parts.impact = [20, `Themes (${provider.impactThemes.join(", ")}) not evident in the enterprise profile`];
    }
  }

  // Financial readiness
  let readiness = READINESS_SCORE[request.readinessStatus] ?? 40;
  const minRevenue = Number(provider.minAnnualRevenueUsd);
  const revenue = Number(enterprise.revenueUsd);
  let readinessReason = `Capital readiness: ${human(request.readinessStatus || "not assessed")}`;
  if (Number.isFinite(minRevenue) && minRevenue > 0) {
    if (!Number.isFinite(revenue) || revenue < minRevenue) {
      readiness = Math.max(0, readiness - 30);
      readinessReason += `; below the provider's ${money(minRevenue)} revenue requirement`;
      gaps.push(`revenue is below the provider's ${money(minRevenue)} minimum`);
    } else {
      readinessReason += "; meets the revenue requirement";
    }
  }
  parts.readiness = [readiness, readinessReason];

  // Provider criteria: instrument, appetite, window, gender and youth focus
  let criteria = 100;
  const reasons = [];
  const instruments = list(provider.instruments);
  if (!instruments.length) {
    criteria = 60;
    reasons.push("no instruments stated");
  } else if (!overlaps(instruments, [norm(request.financingType)])) {
    criteria -= 60;
    reasons.push(`does not offer ${human(request.financingType)}`);
    gaps.push(`the provider does not offer ${human(request.financingType)}`);
  } else {
    reasons.push(`offers ${human(request.financingType)}`);
    strengths.push(`offers ${human(request.financingType)} financing`);
  }
  if (provider.capitalAppetite === "paused") {
    criteria = 0;
    reasons.push("not deploying capital at present");
    gaps.push("the provider is not deploying capital at present");
  }
  const closes = provider.applicationWindowCloses ? new Date(provider.applicationWindowCloses) : null;
  if (closes && closes < now) {
    criteria = Math.min(criteria, 30);
    reasons.push("application window has closed");
    gaps.push("the provider's application window has closed");
  }
  if (provider.genderPreference && provider.genderPreference !== "none") {
    if (norm(enterprise.founderGender) === "female") reasons.push("meets gender focus");
    else {
      criteria = Math.max(0, criteria - 30);
      reasons.push("gender focus not met");
    }
  }
  if (provider.youthPreference === true && enterprise.youthLed !== true) {
    criteria = Math.max(0, criteria - 20);
    reasons.push("youth focus not met");
  }
  parts.criteria = [Math.max(0, criteria), reasons.join("; ")];

  const breakdown = Object.keys(WEIGHTS).map((key) => ({
    key,
    label: LABELS[key],
    weight: WEIGHTS[key],
    score: parts[key][0],
    reason: parts[key][1],
  }));

  const score = Math.round(
    breakdown.reduce((sum, row) => sum + row.score * row.weight, 0) / 100,
  );

  const strength = score >= 75 ? "Strong" : score >= 50 ? "Moderate" : "Weak";
  let explanation = strengths.length
    ? `${strength} match because the capital provider ${strengths.slice(0, 4).join(", ")}.`
    : `${strength} match: few of the provider's stated preferences line up with this request.`;
  if (gaps.length) explanation += ` Watch: ${gaps.slice(0, 3).join("; ")}.`;

  return { score, strength, breakdown, explanation };
};

module.exports = { scoreMatch, toUsd, USD_RATE };
