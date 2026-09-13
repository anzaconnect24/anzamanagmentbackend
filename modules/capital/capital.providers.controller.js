// Capital providers: investors, funds, banks, DFIs, foundations and every other
// source of finance the Capital Facilitation Manager matches enterprises to.
const { Op } = require("sequelize");
const {
  BusinessSector,
  CapitalOpportunity,
  CapitalProvider,
  InvestorProfile,
  User,
} = require("../../models");
const { errorResponse, successResponse } = require("../../utils/responses");
const { audit, diff } = require("../../utils/capital_audit");
const { can } = require("../../utils/capital_access");
const { fail, providerFromInvestor, shapeProvider } = require("./capital.shared");

const LIST_FIELDS = ["preferredSectors", "preferredGeographies", "enterpriseStages", "instruments", "impactThemes", "requiredDocuments"];
const TEXT_FIELDS = ["name", "esgRequirements", "genderPreference", "tractionRequirements", "eligibilityCriteria", "financingCriteria", "previousTransactions", "capitalAppetite", "contactName", "contactEmail", "contactPhone", "status"];
const NUMBER_FIELDS = ["minTicketUsd", "maxTicketUsd", "minAnnualRevenueUsd"];
const DATE_FIELDS = ["applicationWindowOpens", "applicationWindowCloses"];

const asList = (value) =>
  Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : String(value || "").split(",").map((item) => item.trim()).filter(Boolean);

// Reads and checks a provider from a request body. Returns { values } or { error }.
const readProvider = (body, { partial = false } = {}) => {
  const values = {};

  for (const key of TEXT_FIELDS) if (body[key] !== undefined) values[key] = body[key] === "" ? null : String(body[key]).trim();
  for (const key of LIST_FIELDS) if (body[key] !== undefined) values[key] = asList(body[key]);
  for (const key of DATE_FIELDS) if (body[key] !== undefined) values[key] = body[key] || null;
  for (const key of NUMBER_FIELDS) {
    if (body[key] === undefined) continue;
    if (body[key] === "" || body[key] === null) values[key] = null;
    else if (!Number.isFinite(Number(body[key])) || Number(body[key]) < 0) return { error: `${key} must be a non-negative number` };
    else values[key] = Number(body[key]);
  }
  if (body.youthPreference !== undefined) values.youthPreference = body.youthPreference === null ? null : !!body.youthPreference;

  if (body.providerType !== undefined) {
    if (!CapitalProvider.TYPES.includes(body.providerType)) return { error: `Provider type must be one of ${CapitalProvider.TYPES.join(", ")}` };
    values.providerType = body.providerType;
  }

  if (!partial && !values.name) return { error: "A capital provider needs a name" };
  if (values.capitalAppetite && !CapitalProvider.APPETITES.includes(values.capitalAppetite)) {
    return { error: `Capital appetite must be one of ${CapitalProvider.APPETITES.join(", ")}` };
  }
  if (values.minTicketUsd !== undefined && values.maxTicketUsd !== undefined && values.minTicketUsd !== null && values.maxTicketUsd !== null && values.minTicketUsd > values.maxTicketUsd) {
    return { error: "The minimum ticket size cannot be larger than the maximum" };
  }

  return { values };
};

const listProviders = async (req, res) => {
  try {
    const { q, type, sector, status = "active", instrument } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));

    const where = {};
    if (status !== "all") where.status = status;
    if (type) where.providerType = type;
    if (q) where.name = { [Op.like]: `%${q}%` };
    if (sector) where.preferredSectors = { [Op.like]: `%${sector}%` };
    if (instrument) where.instruments = { [Op.like]: `%${instrument}%` };

    const { count, rows } = await CapitalProvider.findAndCountAll({
      where,
      include: [{ model: User, as: "account", attributes: ["uuid", "name", "email", "phone"] }],
      order: [["name", "ASC"]],
      limit,
      offset: (page - 1) * limit,
    });

    const ids = rows.map((row) => row.id);
    const opportunities = ids.length
      ? await CapitalOpportunity.findAll({ where: { capitalProviderId: { [Op.in]: ids } }, attributes: ["capitalProviderId", "status", "outcome"], raw: true })
      : [];

    const reveal = await can(req, "capital.providers.manage");

    successResponse(res, {
      count,
      page,
      totalPages: Math.ceil(count / limit),
      data: rows.map((row) => {
        const mine = opportunities.filter((item) => item.capitalProviderId === row.id);
        return {
          ...shapeProvider(row, { revealContacts: reveal }),
          linkedAccount: !!row.userId,
          activeOpportunities: mine.filter((item) => item.status === "active").length,
          securedOpportunities: mine.filter((item) => CapitalOpportunity.SUCCESS.includes(item.outcome)).length,
        };
      }),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const getProvider = async (req, res) => {
  try {
    const provider = await CapitalProvider.findOne({
      where: { uuid: req.params.uuid },
      include: [{ model: User, as: "account", attributes: ["uuid", "name", "email", "phone"] }],
    });
    if (!provider) return fail(res, 404, "Capital provider not found");

    const opportunities = await CapitalOpportunity.findAll({
      where: { capitalProviderId: provider.id },
      attributes: ["uuid", "reference", "stage", "status", "outcome", "matchScore", "potentialAmount", "amountCommitted", "amountDisbursed", "currency", "updatedAt"],
      order: [["updatedAt", "DESC"]],
    });

    successResponse(res, {
      ...shapeProvider(provider, { revealContacts: await can(req, "capital.providers.manage") }),
      linkedAccount: !!provider.userId,
      opportunities,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const createProvider = async (req, res) => {
  try {
    const { values, error } = readProvider(req.body);
    if (error) return fail(res, 400, error);

    const provider = await CapitalProvider.create({ ...values, createdById: req.user.id });

    await audit(req, {
      action: `Created capital provider ${provider.name}`,
      actionKey: "provider.created",
      entity: { type: "capital_provider", id: provider.id, uuid: provider.uuid },
      providerId: provider.id,
      newValue: values,
    });

    successResponse(res, shapeProvider(provider, { revealContacts: true }));
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateProvider = async (req, res) => {
  try {
    const provider = await CapitalProvider.findOne({ where: { uuid: req.params.uuid } });
    if (!provider) return fail(res, 404, "Capital provider not found");

    const { values, error } = readProvider(req.body, { partial: true });
    if (error) return fail(res, 400, error);

    const merged = { minTicketUsd: provider.minTicketUsd, maxTicketUsd: provider.maxTicketUsd, ...values };
    if (merged.minTicketUsd !== null && merged.maxTicketUsd !== null && Number(merged.minTicketUsd) > Number(merged.maxTicketUsd)) {
      return fail(res, 400, "The minimum ticket size cannot be larger than the maximum");
    }

    const before = provider.toJSON();
    await provider.update(values);
    const change = diff(before, values);

    if (change.changed) {
      await audit(req, {
        action: `Updated capital provider ${provider.name}`,
        actionKey: "provider.updated",
        entity: { type: "capital_provider", id: provider.id, uuid: provider.uuid },
        providerId: provider.id,
        oldValue: change.oldValue,
        newValue: change.newValue,
      });
    }

    successResponse(res, shapeProvider(provider, { revealContacts: true }));
  } catch (error) {
    errorResponse(res, error);
  }
};

// Bring every investor account onto the provider list, so the people already
// on the platform can be matched without being typed in again. Existing
// providers keep any edits the manager made; only missing ones are created.
const syncInvestorProviders = async (req, res) => {
  try {
    const investors = await User.findAll({
      where: { role: "Investor", activated: true },
      attributes: ["id", "name", "email", "phone", "role"],
      include: [{ model: InvestorProfile, required: false, include: [{ model: BusinessSector, attributes: ["name"] }] }],
    });

    const linked = new Set(
      (await CapitalProvider.findAll({ where: { userId: { [Op.ne]: null } }, attributes: ["userId"], raw: true })).map((row) => row.userId),
    );

    const missing = investors.filter((user) => !linked.has(user.id));
    if (missing.length) {
      await CapitalProvider.bulkCreate(missing.map((user) => ({ ...providerFromInvestor(user, user.InvestorProfile), createdById: req.user.id })));
    }

    await audit(req, {
      action: `Synced ${missing.length} investor accounts onto the capital provider list`,
      actionKey: "provider.synced",
      entity: { type: "capital_provider" },
      newValue: { created: missing.length },
    });

    successResponse(res, { created: missing.length, investors: investors.length });
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  listProviders,
  getProvider,
  createProvider,
  updateProvider,
  syncInvestorProviders,
};
