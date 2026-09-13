// Due diligence checklists on capital opportunities.
const { Op } = require("sequelize");
const {
  Business,
  CapitalDdItem,
  CapitalDocument,
  CapitalOpportunity,
  CapitalProvider,
  User,
} = require("../../models");
const { errorResponse, successResponse } = require("../../utils/responses");
const { audit, diff } = require("../../utils/capital_audit");
const { can } = require("../../utils/capital_access");
const { notify, notifyManagers } = require("../../utils/capital_notify");
const { DUE_DILIGENCE_TEMPLATE } = require("../../utils/capital_rules");
const { fail } = require("./capital.shared");

const human = (value) => String(value || "").replace(/_/g, " ");
const today = () => new Date().toISOString().slice(0, 10);

const opportunityInclude = [
  { model: Business, attributes: ["id", "uuid", "name", "userId"] },
  { model: CapitalProvider, attributes: ["id", "uuid", "name", "userId"] },
];

const shapeItem = (row, { staff }) => ({
  uuid: row.uuid,
  category: row.category,
  requirement: row.requirement,
  status: row.status,
  responsibleParty: row.responsibleParty,
  dueDate: row.dueDate,
  overdue: !!row.dueDate && row.dueDate < today() && !CapitalDdItem.DONE.includes(row.status),
  document: row.document ? { uuid: row.document.uuid, title: row.document.title } : null,
  position: row.position,
  updatedAt: row.updatedAt,
  // Risk ratings, reviewer and review comments are Anza's working notes.
  ...(staff ? { riskLevel: row.riskLevel, comments: row.comments, reviewer: row.reviewer ? { uuid: row.reviewer.uuid, name: row.reviewer.name } : null } : {}),
});

const itemInclude = [
  { model: CapitalDocument, as: "document", attributes: ["uuid", "title"] },
  { model: User, as: "reviewer", attributes: ["uuid", "name"] },
];

// ---- Across the portfolio ---------------------------------------------------

const listDueDiligence = async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.riskLevel) where.riskLevel = req.query.riskLevel;
    if (req.query.category) where.category = req.query.category;
    if (req.query.responsibleParty) where.responsibleParty = req.query.responsibleParty;
    if (req.query.overdue === "1") Object.assign(where, { dueDate: { [Op.lt]: today() }, status: { [Op.notIn]: CapitalDdItem.DONE } });

    const rows = await CapitalDdItem.findAll({
      where,
      include: [...itemInclude, { model: CapitalOpportunity, attributes: ["uuid", "reference", "stage", "status"], include: opportunityInclude }],
      order: [["dueDate", "ASC"], ["position", "ASC"]],
      limit: 1000,
    });

    const all = await CapitalDdItem.findAll({ attributes: ["status", "riskLevel", "dueDate"], raw: true });

    successResponse(res, {
      summary: {
        total: all.length,
        verified: all.filter((row) => CapitalDdItem.DONE.includes(row.status)).length,
        underReview: all.filter((row) => row.status === "under_review").length,
        issues: all.filter((row) => row.status === "issue_identified").length,
        overdue: all.filter((row) => row.dueDate && row.dueDate < today() && !CapitalDdItem.DONE.includes(row.status)).length,
        highRisk: all.filter((row) => ["high", "critical"].includes(row.riskLevel) && !CapitalDdItem.DONE.includes(row.status)).length,
      },
      data: rows.map((row) => ({
        ...shapeItem(row, { staff: true }),
        opportunity: {
          uuid: row.CapitalOpportunity.uuid,
          reference: row.CapitalOpportunity.reference,
          stage: row.CapitalOpportunity.stage,
          enterprise: row.CapitalOpportunity.Business.name,
          provider: row.CapitalOpportunity.CapitalProvider.name,
        },
      })),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// ---- One opportunity --------------------------------------------------------

const partyOn = async (req, opportunity) => {
  if (await can(req, "capital.opportunities.view")) return "staff";
  if (opportunity.Business.userId === req.user.id) return "enterprise";
  if (opportunity.CapitalProvider.userId === req.user.id && opportunity.introductionApprovedAt) return "provider";
  return null;
};

const findOpportunity = (uuid) => CapitalOpportunity.findOne({ where: { uuid }, include: opportunityInclude });

const opportunityChecklist = async (req, res) => {
  try {
    const opportunity = await findOpportunity(req.params.uuid);
    if (!opportunity) return fail(res, 404, "Capital opportunity not found");

    const party = await partyOn(req, opportunity);
    if (!party) return fail(res, 404, "Capital opportunity not found");

    const where = { capitalOpportunityId: opportunity.id };
    // A party sees the items it is responsible for.
    if (party !== "staff") where.responsibleParty = party;

    const rows = await CapitalDdItem.findAll({ where, include: itemInclude, order: [["category", "ASC"], ["position", "ASC"]] });
    const staff = party === "staff";

    successResponse(res, {
      party,
      categories: CapitalDdItem.CATEGORIES,
      statuses: CapitalDdItem.STATUSES,
      data: CapitalDdItem.CATEGORIES.map((category) => ({
        category,
        items: rows.filter((row) => row.category === category).map((row) => shapeItem(row, { staff })),
      })).filter((group) => staff || group.items.length),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const applyTemplate = async (req, res) => {
  try {
    const opportunity = await findOpportunity(req.params.uuid);
    if (!opportunity) return fail(res, 404, "Capital opportunity not found");

    const existing = new Set((await CapitalDdItem.findAll({ where: { capitalOpportunityId: opportunity.id }, attributes: ["requirement"], raw: true })).map((row) => row.requirement));
    const due = new Date();
    due.setDate(due.getDate() + (Number(req.body.dueInDays) || 14));

    const rows = DUE_DILIGENCE_TEMPLATE
      .filter(([, requirement]) => !existing.has(requirement))
      .map(([category, requirement, responsibleParty], index) => ({
        capitalOpportunityId: opportunity.id,
        category,
        requirement,
        responsibleParty,
        status: "not_started",
        riskLevel: "low",
        dueDate: due.toISOString().slice(0, 10),
        position: existing.size + index,
      }));

    if (rows.length) await CapitalDdItem.bulkCreate(rows);

    await audit(req, {
      action: `Applied the standard due diligence checklist to ${opportunity.reference} (${rows.length} items)`,
      actionKey: "duediligence.template_applied",
      entity: { type: "capital_opportunity", id: opportunity.id, uuid: opportunity.uuid },
      opportunity,
      newValue: { itemsAdded: rows.length },
    });

    successResponse(res, { added: rows.length });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Reads item fields. Returns { values } or { error }.
const readItem = async (body, opportunity, { partial }) => {
  const values = {};

  if (body.category !== undefined) {
    if (!CapitalDdItem.CATEGORIES.includes(body.category)) return { error: `Category must be one of ${CapitalDdItem.CATEGORIES.join(", ")}` };
    values.category = body.category;
  } else if (!partial) return { error: "Choose a category" };

  if (body.requirement !== undefined) {
    if (!String(body.requirement).trim()) return { error: "Describe the requirement" };
    values.requirement = String(body.requirement).trim();
  } else if (!partial) return { error: "Describe the requirement" };

  const pick = (key, allowed) => {
    if (body[key] === undefined) return null;
    if (!allowed.includes(body[key])) return `${human(key)} must be one of ${allowed.join(", ")}`;
    values[key] = body[key];
    return null;
  };
  const problem = pick("status", CapitalDdItem.STATUSES) || pick("responsibleParty", CapitalDdItem.PARTIES) || pick("riskLevel", CapitalDdItem.RISKS);
  if (problem) return { error: problem };

  if (body.comments !== undefined) values.comments = body.comments || null;
  if (body.dueDate !== undefined) values.dueDate = body.dueDate || null;

  if (body.documentUuid !== undefined) {
    if (!body.documentUuid) values.capitalDocumentId = null;
    else {
      const document = await CapitalDocument.findOne({ where: { uuid: body.documentUuid, deletedAt: null, [Op.or]: [{ capitalOpportunityId: opportunity.id }, { capitalRequestId: opportunity.capitalRequestId }] }, attributes: ["id"] });
      if (!document) return { error: "Attach a document from this opportunity" };
      values.capitalDocumentId = document.id;
    }
  }

  if (body.reviewerUuid !== undefined) {
    if (!body.reviewerUuid) values.reviewerId = null;
    else {
      const reviewer = await User.findOne({ where: { uuid: body.reviewerUuid, activated: true }, attributes: ["id", "role"] });
      if (!reviewer || ["Enterprenuer", "Investor"].includes(reviewer.role)) return { error: "The reviewer must be an Anza staff member" };
      values.reviewerId = reviewer.id;
    }
  }

  return { values };
};

const afterChange = async (req, opportunity, item, before) => {
  if (item.status === "requested" && before.status !== "requested") {
    const recipient = item.responsibleParty === "enterprise" ? opportunity.Business.userId : item.responsibleParty === "provider" ? opportunity.CapitalProvider.userId : null;
    if (recipient) await notify({ userIds: [recipient], type: "capital.duediligence.requested", message: `Due diligence item requested on ${opportunity.reference}: ${item.requirement.slice(0, 120)}`, link: item.responsibleParty === "provider" ? "/dashboard/capital-deals" : "/dashboard/capital" });
  }
  if (item.status === "issue_identified" && ["high", "critical"].includes(item.riskLevel) && before.status !== "issue_identified") {
    await notifyManagers({ managerId: opportunity.assignedManagerId, type: "capital.duediligence.issue", message: `${item.riskLevel === "critical" ? "Critical" : "High-risk"} due diligence issue on ${opportunity.reference}`, link: `/dashboard/capital/opportunities/${opportunity.uuid}` });
  }
};

const createItem = async (req, res) => {
  try {
    const opportunity = await findOpportunity(req.params.uuid);
    if (!opportunity) return fail(res, 404, "Capital opportunity not found");

    const { values, error } = await readItem(req.body, opportunity, { partial: false });
    if (error) return fail(res, 400, error);

    const count = await CapitalDdItem.count({ where: { capitalOpportunityId: opportunity.id } });
    const item = await CapitalDdItem.create({ ...values, capitalOpportunityId: opportunity.id, position: count });

    await audit(req, {
      action: `Added due diligence item to ${opportunity.reference}: ${item.requirement.slice(0, 120)}`,
      actionKey: "duediligence.item_created",
      entity: { type: "capital_dd_item", id: item.id, uuid: item.uuid },
      opportunity,
      newValue: values,
    });

    await afterChange(req, opportunity, item, {});
    successResponse(res, shapeItem(item, { staff: true }));
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateItem = async (req, res) => {
  try {
    const item = await CapitalDdItem.findOne({ where: { uuid: req.params.uuid }, include: [{ model: CapitalOpportunity, include: opportunityInclude }] });
    if (!item) return fail(res, 404, "Due diligence item not found");

    const opportunity = item.CapitalOpportunity;
    const { values, error } = await readItem(req.body, opportunity, { partial: true });
    if (error) return fail(res, 400, error);
    if (!Object.keys(values).length) return fail(res, 400, "Nothing to update");

    const before = item.toJSON();
    await item.update(values);
    const change = diff(before, values);

    if (change.changed) {
      await audit(req, {
        action: `Updated due diligence item on ${opportunity.reference}: ${item.requirement.slice(0, 100)}`,
        actionKey: "duediligence.item_updated",
        entity: { type: "capital_dd_item", id: item.id, uuid: item.uuid },
        opportunity,
        oldValue: change.oldValue,
        newValue: change.newValue,
      });
      await opportunity.update({ lastActivityAt: new Date() });
    }

    await afterChange(req, opportunity, item, before);
    successResponse(res, shapeItem(item, { staff: true }));
  } catch (error) {
    errorResponse(res, error);
  }
};

const deleteItem = async (req, res) => {
  try {
    const item = await CapitalDdItem.findOne({ where: { uuid: req.params.uuid }, include: [{ model: CapitalOpportunity, attributes: ["id", "uuid", "reference", "businessId", "capitalProviderId"] }] });
    if (!item) return fail(res, 404, "Due diligence item not found");

    const snapshot = item.toJSON();
    await item.destroy();

    await audit(req, {
      action: `Removed due diligence item from ${item.CapitalOpportunity.reference}: ${item.requirement.slice(0, 100)}`,
      actionKey: "duediligence.item_deleted",
      entity: { type: "capital_dd_item", id: snapshot.id, uuid: snapshot.uuid },
      opportunity: item.CapitalOpportunity,
      oldValue: { category: snapshot.category, requirement: snapshot.requirement, status: snapshot.status },
    });

    successResponse(res, { uuid: snapshot.uuid, deleted: true });
  } catch (error) {
    errorResponse(res, error);
  }
};

// A responsible party hands in the document for an item.
const submitItem = async (req, res) => {
  try {
    const item = await CapitalDdItem.findOne({ where: { uuid: req.params.uuid }, include: [{ model: CapitalOpportunity, include: opportunityInclude }] });
    if (!item) return fail(res, 404, "Due diligence item not found");

    const opportunity = item.CapitalOpportunity;
    const party = await partyOn(req, opportunity);
    if (!party || (party !== "staff" && party !== item.responsibleParty)) return fail(res, 404, "Due diligence item not found");
    if (CapitalDdItem.DONE.includes(item.status)) return fail(res, 409, "This item is already complete");

    const document = await CapitalDocument.findOne({ where: { uuid: req.body.documentUuid, deletedAt: null, capitalOpportunityId: opportunity.id } });
    if (!document) return fail(res, 400, "Upload the document to this opportunity first, then submit it");

    const before = { status: item.status, capitalDocumentId: item.capitalDocumentId };
    await item.update({ status: "submitted", capitalDocumentId: document.id });

    await audit(req, {
      action: `Submitted "${document.title}" for due diligence on ${opportunity.reference}`,
      actionKey: "duediligence.item_submitted",
      entity: { type: "capital_dd_item", id: item.id, uuid: item.uuid },
      opportunity,
      oldValue: before,
      newValue: { status: "submitted", document: document.uuid },
    });

    await opportunity.update({ lastActivityAt: new Date() });
    await notifyManagers({ managerId: opportunity.assignedManagerId, type: "capital.duediligence.submitted", message: `Due diligence document submitted on ${opportunity.reference}: ${item.requirement.slice(0, 100)}`, link: `/dashboard/capital/opportunities/${opportunity.uuid}` });

    successResponse(res, shapeItem(item, { staff: party === "staff" }));
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  listDueDiligence,
  opportunityChecklist,
  applyTemplate,
  createItem,
  updateItem,
  deleteItem,
  submitItem,
};
