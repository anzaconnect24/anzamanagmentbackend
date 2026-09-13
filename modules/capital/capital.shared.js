// What every capital facilitation controller shares: who the caller is to a
// record, what they may see of it, and the small state updates that must stay
// consistent however a record was changed.
const { Op } = require("sequelize");
const {
  Business,
  BusinessSector,
  CapitalOpportunity,
  CapitalProvider,
  CapitalRequest,
  CapitalThread,
  CohortProgram,
  InvestorProfile,
  User,
} = require("../../models");
const { can } = require("../../utils/capital_access");
const { audit } = require("../../utils/capital_audit");
const { toUsd } = require("../../utils/capital_match");
const { requestStatusFrom } = require("../../utils/capital_rules");

const fail = (res, code, message, extra = {}) =>
  res.status(code).json({ status: false, message, ...extra });

const isManager = (req) => can(req, "capital.opportunities.view");

// ---- Who is calling --------------------------------------------------------

const myBusiness = (userId) =>
  Business.findOne({
    where: { userId },
    include: [{ model: BusinessSector, attributes: ["name"] }],
  });

// A provider record for an investor account, created from their investor
// profile the first time they touch capital facilitation.
const myProvider = async (user) => {
  const existing = await CapitalProvider.findOne({ where: { userId: user.id } });
  if (existing || user.role !== "Investor") return existing;

  const account = await User.findByPk(user.id, {
    attributes: ["id", "name", "email", "phone", "role"],
    include: [{ model: InvestorProfile, include: [{ model: BusinessSector, attributes: ["name"] }] }],
  });

  return account ? CapitalProvider.create(providerFromInvestor(account, account.InvestorProfile)) : null;
};

// ---- Investor profile -> capital provider ---------------------------------

const valuesOf = (value) => {
  if (!value) return [];
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return value.split(",").map((part) => part.trim()).filter(Boolean);
    }
  }
  if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  if (parsed && typeof parsed === "object") return Object.values(parsed).map(String).filter(Boolean);
  return [String(parsed)];
};

// The currency a free-text ticket size is written in. Investor profiles are
// typed by hand, so symbols and local abbreviations count too.
const CURRENCY_HINTS = [
  [/\b(tzs|tsh|tshs)\b|tanzanian shilling/i, "TZS"],
  [/\b(kes|ksh|kshs)\b|kenyan shilling/i, "KES"],
  [/\b(ugx|ush)\b|ugandan shilling/i, "UGX"],
  [/\brwf\b|rwandan franc/i, "RWF"],
  [/\bzar\b|\brand\b/i, "ZAR"],
  [/\beur\b|€|\beuros?\b/i, "EUR"],
  [/\bgbp\b|£|\bpounds?\b/i, "GBP"],
];

const currencyOf = (text) => {
  const hint = CURRENCY_HINTS.find(([pattern]) => pattern.test(text));
  return hint ? hint[1] : "USD";
};

// "$50k - $250k", "USD 1M", "TZS 20 million" -> { min, max } in USD, so every
// provider's range compares on one scale whatever currency it was typed in.
const parseTicket = (text) => {
  const raw = String(text || "");
  const currency = currencyOf(raw);
  const inUsd = (value) => (value === null ? null : toUsd(value, currency));
  const numbers = [];
  const pattern = /(\d+(?:[.,]\d+)*)\s*(k|m|mn|million|thousand|bn|b)?/gi;
  let hit;
  while ((hit = pattern.exec(raw))) {
    let value = Number(hit[1].replace(/,/g, ""));
    const unit = (hit[2] || "").toLowerCase();
    if (unit === "k" || unit === "thousand") value *= 1e3;
    if (unit === "m" || unit === "mn" || unit === "million") value *= 1e6;
    if (unit === "b" || unit === "bn") value *= 1e9;
    if (Number.isFinite(value) && value > 0) numbers.push(value);
  }
  if (numbers.length >= 2) return { min: inUsd(Math.min(...numbers)), max: inUsd(Math.max(...numbers)), currency };
  if (numbers.length === 1) return { min: null, max: inUsd(numbers[0]), currency };
  return { min: null, max: null, currency };
};

const INSTRUMENT_WORDS = [
  ["equity", "equity"],
  ["debt", "debt"],
  ["loan", "debt"],
  ["mezzanine", "convertible"],
  ["convertible", "convertible"],
  ["safe", "convertible"],
  ["grant", "grant"],
  ["revenue", "revenue_based"],
  ["working capital", "working_capital"],
  ["asset", "asset_finance"],
  ["lease", "asset_finance"],
  ["guarantee", "guarantee"],
  ["blended", "blended"],
  ["catalytic", "catalytic"],
];

const instrumentsFrom = (...sources) => {
  const text = sources.flatMap(valuesOf).join(" ").toLowerCase();
  return [...new Set(INSTRUMENT_WORDS.filter(([word]) => text.includes(word)).map(([, key]) => key))];
};

const providerFromInvestor = (user, profile) => {
  const ticket = parseTicket((profile && (profile.ticketSize || profile.investmentSize)) || "");
  return {
    name: (profile && profile.company) || user.name,
    providerType: "investor",
    userId: user.id,
    investorProfileId: profile ? profile.id : null,
    preferredSectors: profile && profile.BusinessSector ? [profile.BusinessSector.name] : [],
    preferredGeographies: valuesOf(profile && profile.geography),
    minTicketUsd: ticket.min,
    maxTicketUsd: ticket.max,
    instruments: instrumentsFrom(profile && profile.structure, profile && profile.investmentType),
    impactThemes: valuesOf(profile && profile.investmentFocus),
    previousTransactions: (profile && profile.notableInvestment) || null,
    contactName: user.name,
    contactEmail: user.email,
    contactPhone: user.phone,
    status: "active",
  };
};

// ---- What a caller may see -------------------------------------------------

const plain = (row) => (row && row.toJSON ? row.toJSON() : row);

// A provider as someone may see it. Contact details are confidential until an
// introduction to it has been approved.
const shapeProvider = (row, { revealContacts = false } = {}) => {
  const data = plain(row);
  if (!data) return null;
  const shaped = { ...data };
  delete shaped.id;
  delete shaped.userId;
  delete shaped.investorProfileId;
  delete shaped.createdById;
  if (!revealContacts) {
    for (const key of CapitalProvider.CONFIDENTIAL) delete shaped[key];
    delete shaped.account;
  } else if (shaped.account) {
    shaped.account = { uuid: shaped.account.uuid, name: shaped.account.name, email: shaped.account.email, phone: shaped.account.phone };
  }
  return shaped;
};

const shapeBusiness = (business, { revealContacts = false } = {}) => {
  const data = plain(business);
  if (!data) return null;
  return {
    uuid: data.uuid,
    name: data.name,
    sector: data.BusinessSector ? data.BusinessSector.name : null,
    location: data.location,
    stage: data.stage,
    revenue: data.revenue,
    ...(revealContacts ? { email: data.email, phone: data.phone } : {}),
  };
};

const shapeUser = (user, { revealContacts = false } = {}) => {
  const data = plain(user);
  if (!data) return null;
  return {
    uuid: data.uuid,
    name: data.name,
    role: data.role,
    ...(revealContacts ? { email: data.email, phone: data.phone } : {}),
  };
};

// ---- Matching context ------------------------------------------------------

const enterpriseProfile = (business, request) => {
  const data = plain(business) || {};
  const sector = data.BusinessSector ? data.BusinessSector.name : null;
  return {
    sector,
    location: data.location,
    stage: data.stage,
    revenueUsd: toUsd(
      request.currentRevenue !== null && request.currentRevenue !== undefined ? request.currentRevenue : data.revenue,
      request.revenueCurrency || request.currency,
    ),
    impactText: [data.impact, data.sdg, data.description, data.problem, data.solution, sector].filter(Boolean).join(" "),
    founderGender: request.founderGender,
    youthLed: request.youthLed,
  };
};

// ---- Keeping state consistent ----------------------------------------------

const touch = (opportunity, transaction) =>
  opportunity.update({ lastActivityAt: new Date() }, { transaction, silent: false });

// A request's status follows its most advanced opportunity.
const syncRequestStatus = async (req, capitalRequestId, transaction) => {
  const request = await CapitalRequest.findByPk(capitalRequestId, { transaction });
  if (!request) return null;

  const opportunities = await CapitalOpportunity.findAll({
    where: { capitalRequestId },
    attributes: ["stage", "status", "outcome"],
    raw: true,
    transaction,
  });

  const next = requestStatusFrom(opportunities, request.status);
  if (next && next !== request.status) {
    const previous = request.status;
    await request.update({ status: next }, { transaction });
    await audit(req, {
      action: `Capital request ${request.reference} moved to ${next.replace(/_/g, " ")}`,
      actionKey: "request.status_synced",
      entity: { type: "capital_request", id: request.id, uuid: request.uuid },
      businessId: request.businessId,
      oldValue: { status: previous },
      newValue: { status: next },
    });
  }
  return request;
};

const ensureThread = async (capitalOpportunityId, kind, transaction) => {
  const [thread] = await CapitalThread.findOrCreate({
    where: { capitalOpportunityId, kind },
    defaults: { capitalOpportunityId, kind },
    transaction,
  });
  return thread;
};

// ---- Filters ---------------------------------------------------------------

const businessInclude = (query = {}) => {
  const where = {};
  if (query.region) where.location = { [Op.like]: `%${query.region}%` };
  if (query.enterprise) where.uuid = query.enterprise;

  return {
    model: Business,
    attributes: ["id", "uuid", "name", "location", "stage", "revenue", "businessSectorId"],
    required: Object.keys(where).length > 0 || !!query.sector,
    where: Object.keys(where).length ? where : undefined,
    include: [
      {
        model: BusinessSector,
        attributes: ["name"],
        required: !!query.sector,
        where: query.sector ? { name: query.sector } : undefined,
      },
    ],
  };
};

const dateRange = (query) => {
  if (!query.dateFrom && !query.dateTo) return null;
  const range = {};
  if (query.dateFrom) range[Op.gte] = new Date(`${query.dateFrom}T00:00:00`);
  if (query.dateTo) range[Op.lte] = new Date(`${query.dateTo}T23:59:59`);
  return range;
};

// Resolve a programme uuid, manager uuid and provider uuid to ids once.
const resolveFilterIds = async (query = {}) => {
  const ids = {};
  if (query.programme) {
    const programme = await CohortProgram.findOne({ where: { uuid: query.programme }, attributes: ["id"] });
    ids.cohortProgramId = programme ? programme.id : -1;
  }
  if (query.manager) {
    const manager = await User.findOne({ where: { uuid: query.manager }, attributes: ["id"] });
    ids.managerId = manager ? manager.id : -1;
  }
  if (query.provider) {
    const provider = await CapitalProvider.findOne({ where: { uuid: query.provider }, attributes: ["id"] });
    ids.providerId = provider ? provider.id : -1;
  }
  return ids;
};

module.exports = {
  fail,
  isManager,
  myBusiness,
  myProvider,
  providerFromInvestor,
  parseTicket,
  shapeProvider,
  shapeBusiness,
  shapeUser,
  enterpriseProfile,
  touch,
  syncRequestStatus,
  ensureThread,
  businessInclude,
  dateRange,
  resolveFilterIds,
  plain,
};
