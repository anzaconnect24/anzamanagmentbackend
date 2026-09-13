// Deal rooms and capital documents.
//
// Every document carries a visibility, and every access to one - view,
// download, permission change, replacement, deletion - is written to the audit
// trail before it happens. If the audit write fails the access is refused, so
// no confidential document is ever opened unrecorded.
const fs = require("fs");
const { Op } = require("sequelize");
const {
  Business,
  CapitalDealRoom,
  CapitalDocument,
  CapitalOpportunity,
  CapitalProvider,
  CapitalRequest,
  User,
} = require("../../models");
const { errorResponse, successResponse } = require("../../utils/responses");
const { audit } = require("../../utils/capital_audit");
const { can } = require("../../utils/capital_access");
const { notify, notifyManagers } = require("../../utils/capital_notify");
const { removeStored, storedPath } = require("../../utils/capital_upload");
const { stageIndex } = require("../../utils/capital_rules");
const { fail } = require("./capital.shared");

const human = (value) => String(value || "").replace(/_/g, " ");

const opportunityInclude = [
  { model: Business, attributes: ["id", "uuid", "name", "userId"] },
  { model: CapitalProvider, attributes: ["id", "uuid", "name", "userId"] },
];

// Who the caller is to a document's context: staff, enterprise or provider.
const roleIn = async (req, { opportunity, request }) => {
  const staff = (await can(req, "capital.opportunities.view")) || (await can(req, "capital.requests.view"));
  if (staff) return "staff";
  const business = (opportunity && opportunity.Business) || (request && request.Business);
  if (business && business.userId === req.user.id) return "enterprise";
  if (opportunity && opportunity.CapitalProvider && opportunity.CapitalProvider.userId === req.user.id) return "provider";
  return null;
};

// Whether a caller may open a document.
const mayOpen = async (req, document, context) => {
  const role = await roleIn(req, context);
  if (!role) return false;

  if (role === "staff") {
    if (document.visibility === "restricted") return can(req, "capital.dealrooms.manage");
    if (CapitalDocument.SENSITIVE.includes(document.category)) return can(req, "capital.documents.confidential");
    return true;
  }

  if (document.uploadedById === req.user.id) return true;

  if (role === "enterprise") return ["enterprise", "both"].includes(document.visibility);

  // A provider sees nothing of an enterprise before an approved introduction.
  const approved = context.opportunity && context.opportunity.introductionApprovedAt;
  return !!approved && ["provider", "both"].includes(document.visibility);
};

const contextFor = async (document) => {
  const opportunity = document.capitalOpportunityId
    ? await CapitalOpportunity.findByPk(document.capitalOpportunityId, { include: opportunityInclude })
    : null;
  const request = document.capitalRequestId
    ? await CapitalRequest.findByPk(document.capitalRequestId, { include: [{ model: Business, attributes: ["id", "uuid", "name", "userId"] }] })
    : null;
  return { opportunity, request };
};

const shapeDocument = (row, { staff = false } = {}) => ({
  uuid: row.uuid,
  title: row.title,
  category: row.category,
  visibility: row.visibility,
  version: row.version,
  originalName: row.originalName,
  mimeType: row.mimeType,
  sizeBytes: row.sizeBytes,
  inDealRoom: !!row.capitalDealRoomId,
  uploadedBy: row.uploadedBy ? { name: row.uploadedBy.name, ...(staff ? { role: row.uploadedBy.role } : {}) } : null,
  createdAt: row.createdAt,
});

// Only the current version of each document: a replaced row is history.
const currentOnly = (rows) => {
  const replaced = new Set(rows.map((row) => row.replacesDocumentId).filter(Boolean));
  return rows.filter((row) => !replaced.has(row.id));
};

// ---- Deal rooms -------------------------------------------------------------

const createDealRoom = async (req, res) => {
  try {
    const opportunity = await CapitalOpportunity.findOne({ where: { uuid: req.params.uuid }, include: opportunityInclude });
    if (!opportunity) return fail(res, 404, "Capital opportunity not found");

    if (!opportunity.introductionApprovedAt || stageIndex(opportunity.stage) < stageIndex("provider_interest")) {
      return fail(res, 409, "Open a deal room once the capital provider has shown serious interest");
    }

    const existing = await CapitalDealRoom.findOne({ where: { capitalOpportunityId: opportunity.id } });
    if (existing) return fail(res, 409, "This opportunity already has a deal room");

    const room = await CapitalDealRoom.create({
      capitalOpportunityId: opportunity.id,
      name: String(req.body.name || `${opportunity.Business.name} x ${opportunity.CapitalProvider.name}`).slice(0, 255),
      createdById: req.user.id,
    });

    // Documents already on the opportunity move into the room, keeping their
    // own visibility.
    await CapitalDocument.update({ capitalDealRoomId: room.id }, { where: { capitalOpportunityId: opportunity.id, capitalDealRoomId: null } });

    await audit(req, {
      action: `Opened deal room for ${opportunity.reference}`,
      actionKey: "dealroom.created",
      entity: { type: "capital_deal_room", id: room.id, uuid: room.uuid },
      opportunity,
      newValue: { name: room.name },
    });

    const recipients = [opportunity.Business.userId, opportunity.CapitalProvider.userId].filter(Boolean);
    await notify({ userIds: recipients, type: "capital.dealroom.opened", message: `Anza opened a deal room for ${opportunity.reference}`, link: "/dashboard/capital" });

    successResponse(res, { uuid: room.uuid, name: room.name, status: room.status });
  } catch (error) {
    errorResponse(res, error);
  }
};

const listDealRooms = async (req, res) => {
  try {
    const rooms = await CapitalDealRoom.findAll({
      include: [{ model: CapitalOpportunity, attributes: ["uuid", "reference", "stage", "status"], include: opportunityInclude }],
      order: [["updatedAt", "DESC"]],
    });

    const documents = rooms.length
      ? await CapitalDocument.findAll({ where: { capitalDealRoomId: { [Op.in]: rooms.map((room) => room.id) }, deletedAt: null }, attributes: ["id", "capitalDealRoomId", "visibility", "replacesDocumentId", "createdAt"], raw: true })
      : [];

    successResponse(res, {
      data: rooms.map((room) => {
        const mine = currentOnly(documents.filter((row) => row.capitalDealRoomId === room.id));
        const opportunity = room.CapitalOpportunity;
        return {
          uuid: room.uuid,
          name: room.name,
          status: room.status,
          opportunity: { uuid: opportunity.uuid, reference: opportunity.reference, stage: opportunity.stage, status: opportunity.status, enterprise: opportunity.Business.name, provider: opportunity.CapitalProvider.name },
          documents: mine.length,
          byVisibility: CapitalDocument.VISIBILITIES.reduce((acc, key) => ({ ...acc, [key]: mine.filter((row) => row.visibility === key).length }), {}),
          lastUploadAt: mine.reduce((latest, row) => (!latest || row.createdAt > latest ? row.createdAt : latest), null),
          createdAt: room.createdAt,
        };
      }),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// The documents on an opportunity the caller may open, and its deal room.
const opportunityDocuments = async (req, res) => {
  try {
    const opportunity = await CapitalOpportunity.findOne({ where: { uuid: req.params.uuid }, include: opportunityInclude });
    if (!opportunity) return fail(res, 404, "Capital opportunity not found");

    const role = await roleIn(req, { opportunity });
    if (!role) return fail(res, 404, "Capital opportunity not found");

    const [room, rows] = await Promise.all([
      CapitalDealRoom.findOne({ where: { capitalOpportunityId: opportunity.id } }),
      CapitalDocument.findAll({
        where: { [Op.or]: [{ capitalOpportunityId: opportunity.id }, { capitalRequestId: opportunity.capitalRequestId }], deletedAt: null },
        include: [{ model: User, as: "uploadedBy", attributes: ["name", "role"] }],
        order: [["category", "ASC"], ["createdAt", "DESC"]],
      }),
    ]);

    const visible = [];
    for (const row of currentOnly(rows)) {
      const context = { opportunity, request: row.capitalRequestId ? { Business: opportunity.Business } : null };
      if (await mayOpen(req, row, context)) visible.push(shapeDocument(row, { staff: role === "staff" }));
    }

    successResponse(res, {
      party: role,
      dealRoom: room ? { uuid: room.uuid, name: room.name, status: room.status } : null,
      categories: CapitalDocument.CATEGORIES,
      visibilities: role === "staff" ? CapitalDocument.VISIBILITIES : undefined,
      data: visible,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// ---- Documents --------------------------------------------------------------

const uploadOpportunityDocument = async (req, res) => {
  try {
    if (!req.file) return fail(res, 400, "Choose a file to upload");

    const opportunity = await CapitalOpportunity.findOne({ where: { uuid: req.params.uuid }, include: opportunityInclude });
    const role = opportunity && (await roleIn(req, { opportunity }));
    if (!role) {
      removeStored(req.file.filename);
      return fail(res, 404, "Capital opportunity not found");
    }
    if (role === "provider" && !opportunity.introductionApprovedAt) {
      removeStored(req.file.filename);
      return fail(res, 409, "Documents can be shared once Anza has approved the introduction");
    }

    const manager = await can(req, "capital.dealrooms.manage");
    const category = CapitalDocument.CATEGORIES.includes(req.body.category) ? req.body.category : "other";
    // A party's upload is visible to itself and Anza until the manager decides
    // to share it; a manager chooses.
    const visibility = manager && CapitalDocument.VISIBILITIES.includes(req.body.visibility)
      ? req.body.visibility
      : role === "provider" ? "provider" : role === "enterprise" ? "enterprise" : "internal";

    const room = await CapitalDealRoom.findOne({ where: { capitalOpportunityId: opportunity.id } });

    const document = await CapitalDocument.create({
      capitalOpportunityId: opportunity.id,
      capitalDealRoomId: room ? room.id : null,
      businessId: opportunity.businessId,
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
      action: `Uploaded ${human(category)} "${document.title}" to ${opportunity.reference}`,
      actionKey: "document.uploaded",
      entity: { type: "capital_document", id: document.id, uuid: document.uuid },
      opportunity,
      newValue: { title: document.title, category, visibility, sizeBytes: document.sizeBytes },
    }, { strict: true });

    if (role !== "staff") {
      await notifyManagers({ managerId: opportunity.assignedManagerId, type: "capital.document.uploaded", message: `${role === "enterprise" ? opportunity.Business.name : opportunity.CapitalProvider.name} uploaded "${document.title}" to ${opportunity.reference}`, link: `/dashboard/capital/opportunities/${opportunity.uuid}` });
    } else if (visibility === "both" || visibility === "enterprise" || visibility === "provider") {
      const recipients = [
        ["enterprise", "both"].includes(visibility) ? opportunity.Business.userId : null,
        ["provider", "both"].includes(visibility) && opportunity.introductionApprovedAt ? opportunity.CapitalProvider.userId : null,
      ].filter(Boolean);
      await notify({ userIds: recipients, type: "capital.document.shared", message: `A document was shared with you on ${opportunity.reference}`, link: "/dashboard/capital" });
    }

    successResponse(res, shapeDocument(document, { staff: role === "staff" }));
  } catch (error) {
    if (req.file) removeStored(req.file.filename);
    errorResponse(res, error);
  }
};

const openDocument = async (req, res) => {
  try {
    const document = await CapitalDocument.findOne({ where: { uuid: req.params.uuid, deletedAt: null } });
    if (!document) return fail(res, 404, "Document not found");

    const context = await contextFor(document);
    if (!(await mayOpen(req, document, context))) return fail(res, 404, "Document not found");

    const file = storedPath(document.storedName);
    if (!file || !fs.existsSync(file)) return fail(res, 410, "The file for this document is no longer available");

    const download = req.query.mode === "download";

    // Recorded before the bytes are sent. No record, no file.
    await audit(req, {
      action: `${download ? "Downloaded" : "Viewed"} "${document.title}"${context.opportunity ? ` on ${context.opportunity.reference}` : ""}`,
      actionKey: download ? "document.downloaded" : "document.viewed",
      entity: { type: "capital_document", id: document.id, uuid: document.uuid },
      opportunity: context.opportunity,
      businessId: document.businessId,
      details: { category: document.category, visibility: document.visibility, version: document.version },
    }, { strict: true });

    res.setHeader("Content-Type", document.mimeType || "application/octet-stream");
    res.setHeader("Cache-Control", "private, no-store");
    const name = encodeURIComponent(document.originalName);
    res.setHeader("Content-Disposition", `${download ? "attachment" : "inline"}; filename*=UTF-8''${name}`);
    fs.createReadStream(file).pipe(res);
  } catch (error) {
    errorResponse(res, error);
  }
};

const changeVisibility = async (req, res) => {
  try {
    const { visibility, reason } = req.body;
    if (!CapitalDocument.VISIBILITIES.includes(visibility)) return fail(res, 400, `Visibility must be one of ${CapitalDocument.VISIBILITIES.join(", ")}`);

    const document = await CapitalDocument.findOne({ where: { uuid: req.params.uuid, deletedAt: null } });
    if (!document) return fail(res, 404, "Document not found");
    if (document.visibility === visibility) return fail(res, 400, "The document already has that visibility");

    const context = await contextFor(document);
    if (["provider", "both"].includes(visibility) && (!context.opportunity || !context.opportunity.introductionApprovedAt)) {
      return fail(res, 409, "A document can be shared with a capital provider only after an approved introduction");
    }

    const before = document.visibility;
    await document.update({ visibility });

    await audit(req, {
      action: `Changed visibility of "${document.title}" from ${before} to ${visibility}`,
      actionKey: "document.permission_changed",
      entity: { type: "capital_document", id: document.id, uuid: document.uuid },
      opportunity: context.opportunity,
      businessId: document.businessId,
      oldValue: { visibility: before },
      newValue: { visibility },
      details: reason ? { reason } : undefined,
    }, { strict: true });

    if (context.opportunity && ["provider", "both"].includes(visibility) && context.opportunity.CapitalProvider.userId) {
      await notify({ userIds: [context.opportunity.CapitalProvider.userId], type: "capital.document.shared", message: `"${document.title}" was shared with you on ${context.opportunity.reference}`, link: "/dashboard/capital-deals" });
    }

    successResponse(res, { uuid: document.uuid, visibility });
  } catch (error) {
    errorResponse(res, error);
  }
};

const replaceDocument = async (req, res) => {
  try {
    if (!req.file) return fail(res, 400, "Choose the new file");

    const previous = await CapitalDocument.findOne({ where: { uuid: req.params.uuid, deletedAt: null } });
    if (!previous) {
      removeStored(req.file.filename);
      return fail(res, 404, "Document not found");
    }

    const context = await contextFor(previous);
    const manager = await can(req, "capital.dealrooms.manage");
    if (!manager && previous.uploadedById !== req.user.id) {
      removeStored(req.file.filename);
      return fail(res, 403, "Only the uploader or a Capital Facilitation Manager can replace this document");
    }

    const current = await CapitalDocument.create({
      capitalRequestId: previous.capitalRequestId,
      capitalOpportunityId: previous.capitalOpportunityId,
      capitalDealRoomId: previous.capitalDealRoomId,
      businessId: previous.businessId,
      category: previous.category,
      title: String(req.body.title || previous.title).slice(0, 255),
      originalName: req.file.originalname.slice(0, 255),
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      visibility: previous.visibility,
      version: previous.version + 1,
      replacesDocumentId: previous.id,
      uploadedById: req.user.id,
    });

    await audit(req, {
      action: `Replaced "${previous.title}" with version ${current.version}`,
      actionKey: "document.replaced",
      entity: { type: "capital_document", id: current.id, uuid: current.uuid },
      opportunity: context.opportunity,
      businessId: previous.businessId,
      oldValue: { uuid: previous.uuid, version: previous.version, originalName: previous.originalName },
      newValue: { uuid: current.uuid, version: current.version, originalName: current.originalName },
    }, { strict: true });

    successResponse(res, shapeDocument(current, { staff: manager }));
  } catch (error) {
    if (req.file) removeStored(req.file.filename);
    errorResponse(res, error);
  }
};

// Soft delete: the row and the file stay for the record; nobody can open it.
const deleteDocument = async (req, res) => {
  try {
    if (!String(req.body.reason || "").trim()) return fail(res, 400, "Give a reason for deleting the document");

    const document = await CapitalDocument.findOne({ where: { uuid: req.params.uuid, deletedAt: null } });
    if (!document) return fail(res, 404, "Document not found");

    const context = await contextFor(document);
    await document.update({ deletedAt: new Date(), deletedById: req.user.id });

    await audit(req, {
      action: `Deleted "${document.title}"`,
      actionKey: "document.deleted",
      entity: { type: "capital_document", id: document.id, uuid: document.uuid },
      opportunity: context.opportunity,
      businessId: document.businessId,
      oldValue: { title: document.title, visibility: document.visibility },
      details: { reason: req.body.reason },
    }, { strict: true });

    successResponse(res, { uuid: document.uuid, deleted: true });
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  mayOpen,
  createDealRoom,
  listDealRooms,
  opportunityDocuments,
  uploadOpportunityDocument,
  openDocument,
  changeVisibility,
  replaceDocument,
  deleteDocument,
};
