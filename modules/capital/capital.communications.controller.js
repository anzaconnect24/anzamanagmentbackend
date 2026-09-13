// The Capital Facilitation Communication Centre.
//
// Each opportunity has up to three threads: enterprise <-> provider, and each
// side with the Capital Facilitation Manager. The opportunity's mode decides
// what happens to a message between the two parties:
//   moderated - held until the manager approves, edits or rejects it
//   monitored - delivered at once; the manager reads along and can step in
//   direct    - delivered at once; the manager still follows the deal
// Nothing passes between the parties before an approved introduction.
const { Op } = require("sequelize");
const {
  Business,
  CapitalIntervention,
  CapitalMessage,
  CapitalOpportunity,
  CapitalProvider,
  CapitalThread,
  User,
  sequelize,
} = require("../../models");
const { errorResponse, successResponse } = require("../../utils/responses");
const { audit } = require("../../utils/capital_audit");
const { can } = require("../../utils/capital_access");
const { notify, notifyManagers } = require("../../utils/capital_notify");
const { ensureThread, fail } = require("./capital.shared");

const opportunityInclude = [
  { model: Business, attributes: ["id", "uuid", "name", "userId"] },
  { model: CapitalProvider, attributes: ["id", "uuid", "name", "userId"] },
];

// Who the caller is on this opportunity: manager, enterprise, provider, or nobody.
const partyOf = async (req, opportunity) => {
  if (await can(req, "capital.communications.moderate")) return "manager";
  if (opportunity.Business && opportunity.Business.userId === req.user.id) return "enterprise";
  if (opportunity.CapitalProvider && opportunity.CapitalProvider.userId === req.user.id) return "provider";
  return null;
};

// The threads a party may be in.
const kindsFor = (party, opportunity) => {
  if (party === "manager") return CapitalThread.KINDS;
  const own = party === "enterprise" ? "enterprise_manager" : party === "provider" ? "provider_manager" : null;
  if (!own) return [];
  return opportunity.introductionApprovedAt ? [own, "enterprise_provider"] : [own];
};

const shapeMessage = (row, { party, userId }) => ({
  uuid: row.uuid,
  body: row.body,
  status: row.status,
  senderRole: row.senderRole,
  sender: row.sender ? { uuid: row.sender.uuid, name: row.sender.name } : null,
  mine: row.senderId === userId,
  isIntervention: row.isIntervention,
  createdAt: row.createdAt,
  // The manager sees the whole moderation record; a party sees only whether
  // its own message was held, edited or rejected, and why.
  ...(party === "manager"
    ? { originalBody: row.originalBody, moderationNote: row.moderationNote, moderatedAt: row.moderatedAt }
    : row.senderId === userId
      ? { edited: !!row.originalBody, moderationNote: row.status === "rejected" ? row.moderationNote : null }
      : {}),
});

// A party sees delivered messages, plus its own whatever their state.
const visibleMessages = (party, userId) =>
  party === "manager"
    ? {}
    : { [Op.or]: [{ status: "delivered" }, { senderId: userId }] };

// ---- Manager: the centre and the queue -------------------------------------

const communicationCentre = async (req, res) => {
  try {
    const opportunityWhere = {};
    if (req.query.mode) opportunityWhere.communicationMode = req.query.mode;
    if (req.query.opportunity) opportunityWhere.uuid = req.query.opportunity;

    const threadWhere = {};
    if (req.query.kind) threadWhere.kind = req.query.kind;

    const threads = await CapitalThread.findAll({
      where: threadWhere,
      include: [{ model: CapitalOpportunity, where: opportunityWhere, attributes: ["id", "uuid", "reference", "communicationMode", "communicationPaused", "stage", "status"], include: opportunityInclude }],
      order: [["lastMessageAt", "DESC"], ["id", "DESC"]],
      limit: 300,
    });

    const ids = threads.map((thread) => thread.id);
    const messages = ids.length
      ? await CapitalMessage.findAll({ where: { capitalThreadId: { [Op.in]: ids } }, attributes: ["capitalThreadId", "status", "body", "createdAt"], order: [["createdAt", "DESC"]], raw: true })
      : [];

    const data = threads
      .map((thread) => {
        const mine = messages.filter((row) => row.capitalThreadId === thread.id);
        const opportunity = thread.CapitalOpportunity;
        return {
          uuid: thread.uuid,
          kind: thread.kind,
          lastMessageAt: thread.lastMessageAt,
          messages: mine.length,
          pendingApproval: mine.filter((row) => row.status === "pending_approval").length,
          preview: mine.length ? String(mine[0].body).slice(0, 140) : null,
          opportunity: {
            uuid: opportunity.uuid,
            reference: opportunity.reference,
            communicationMode: opportunity.communicationMode,
            communicationPaused: opportunity.communicationPaused,
            stage: opportunity.stage,
            status: opportunity.status,
            enterprise: opportunity.Business ? opportunity.Business.name : null,
            provider: opportunity.CapitalProvider ? opportunity.CapitalProvider.name : null,
          },
        };
      })
      .filter((row) => req.query.pending !== "1" || row.pendingApproval > 0);

    successResponse(res, { count: data.length, data });
  } catch (error) {
    errorResponse(res, error);
  }
};

const moderationQueue = async (req, res) => {
  try {
    const rows = await CapitalMessage.findAll({
      where: { status: "pending_approval" },
      include: [
        { model: User, as: "sender", attributes: ["uuid", "name", "role"] },
        { model: CapitalThread, include: [{ model: CapitalOpportunity, attributes: ["uuid", "reference", "communicationMode"], include: opportunityInclude }] },
      ],
      order: [["createdAt", "ASC"]],
    });

    successResponse(res, {
      count: rows.length,
      data: rows.map((row) => ({
        uuid: row.uuid,
        body: row.body,
        createdAt: row.createdAt,
        sender: row.sender,
        senderRole: row.senderRole,
        thread: { uuid: row.CapitalThread.uuid, kind: row.CapitalThread.kind },
        opportunity: {
          uuid: row.CapitalThread.CapitalOpportunity.uuid,
          reference: row.CapitalThread.CapitalOpportunity.reference,
          enterprise: row.CapitalThread.CapitalOpportunity.Business.name,
          provider: row.CapitalThread.CapitalOpportunity.CapitalProvider.name,
        },
      })),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// ---- Reading ----------------------------------------------------------------

// The threads on an opportunity that the caller may open, created as needed.
const opportunityThreads = async (req, res) => {
  try {
    const opportunity = await CapitalOpportunity.findOne({ where: { uuid: req.params.uuid }, include: opportunityInclude });
    if (!opportunity) return fail(res, 404, "Capital opportunity not found");

    const party = await partyOf(req, opportunity);
    if (!party) return fail(res, 404, "Capital opportunity not found");

    const threads = [];
    for (const kind of kindsFor(party, opportunity)) threads.push(await ensureThread(opportunity.id, kind));

    successResponse(res, {
      party,
      communicationMode: opportunity.communicationMode,
      communicationPaused: opportunity.communicationPaused,
      introductionApproved: !!opportunity.introductionApprovedAt,
      data: threads.map((thread) => ({ uuid: thread.uuid, kind: thread.kind, lastMessageAt: thread.lastMessageAt })),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const loadThread = async (uuid, transaction) =>
  CapitalThread.findOne({
    where: { uuid },
    include: [{ model: CapitalOpportunity, include: opportunityInclude }],
    transaction,
  });

const getThread = async (req, res) => {
  try {
    const thread = await loadThread(req.params.uuid);
    if (!thread) return fail(res, 404, "Conversation not found");

    const opportunity = thread.CapitalOpportunity;
    const party = await partyOf(req, opportunity);
    if (!party || !kindsFor(party, opportunity).includes(thread.kind)) return fail(res, 404, "Conversation not found");

    const messages = await CapitalMessage.findAll({
      where: { capitalThreadId: thread.id, ...visibleMessages(party, req.user.id) },
      include: [{ model: User, as: "sender", attributes: ["uuid", "name"] }],
      order: [["createdAt", "ASC"]],
    });

    const blocked =
      party !== "manager" &&
      (opportunity.communicationPaused || opportunity.status !== "active");

    successResponse(res, {
      uuid: thread.uuid,
      kind: thread.kind,
      party,
      opportunity: {
        uuid: opportunity.uuid,
        reference: opportunity.reference,
        communicationMode: opportunity.communicationMode,
        communicationPaused: opportunity.communicationPaused,
        enterprise: opportunity.Business.name,
        provider: opportunity.CapitalProvider.name,
      },
      canPost: !blocked,
      moderated: thread.kind === "enterprise_provider" && opportunity.communicationMode === "moderated" && party !== "manager",
      data: messages.map((row) => shapeMessage(row, { party, userId: req.user.id })),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// ---- Writing ----------------------------------------------------------------

const postMessage = async (req, res) => {
  const transaction = await sequelize.transaction();
  const refuse = async (code, message) => {
    await transaction.rollback();
    return fail(res, code, message);
  };

  try {
    const body = String(req.body.body || "").trim();
    if (!body) return refuse(400, "Write a message");
    if (body.length > 5000) return refuse(400, "Keep the message under 5,000 characters");

    const thread = await loadThread(req.params.uuid, transaction);
    if (!thread) return refuse(404, "Conversation not found");

    const opportunity = thread.CapitalOpportunity;
    const party = await partyOf(req, opportunity);
    if (!party || !kindsFor(party, opportunity).includes(thread.kind)) return refuse(404, "Conversation not found");

    if (party !== "manager") {
      if (opportunity.status !== "active") return refuse(409, "This opportunity is closed");
      if (opportunity.communicationPaused) return refuse(409, "Anza has paused communication on this opportunity");
    }

    const between = thread.kind === "enterprise_provider";
    const held = between && party !== "manager" && opportunity.communicationMode === "moderated";
    const intervention = between && party === "manager";

    const message = await CapitalMessage.create({
      capitalThreadId: thread.id,
      senderId: req.user.id,
      senderRole: req.user.role,
      body,
      status: held ? "pending_approval" : "delivered",
      isIntervention: intervention,
    }, { transaction });

    await thread.update({ lastMessageAt: new Date() }, { transaction });
    await opportunity.update({ lastActivityAt: new Date() }, { transaction });

    if (intervention) {
      await CapitalIntervention.create({
        capitalOpportunityId: opportunity.id,
        action: "communication_intervention",
        reason: "Manager wrote into the enterprise-provider conversation",
        comments: body.slice(0, 500),
        previousStatus: opportunity.communicationMode,
        newStatus: opportunity.communicationMode,
        userId: req.user.id,
      }, { transaction });
    }

    await transaction.commit();

    await audit(req, {
      action: intervention
        ? `Intervened in the ${opportunity.reference} conversation between the parties`
        : `Sent a message on ${opportunity.reference} (${thread.kind.replace(/_/g, " ")})${held ? " - held for approval" : ""}`,
      actionKey: intervention ? "communication.intervention" : held ? "communication.held" : "communication.sent",
      entity: { type: "capital_message", id: message.id, uuid: message.uuid },
      opportunity,
      newValue: { status: message.status, length: body.length },
    }, { strict: intervention });

    // Who hears about it.
    const enterpriseUser = opportunity.Business.userId;
    const providerUser = opportunity.CapitalProvider.userId;
    const managerLink = `/dashboard/capital/communications?thread=${thread.uuid}`;

    if (held) {
      await notifyManagers({ managerId: opportunity.assignedManagerId, type: "capital.message.pending", message: `A message on ${opportunity.reference} is waiting for your approval`, link: managerLink });
    } else if (between) {
      const recipients = [party === "enterprise" ? providerUser : enterpriseUser, ...(party === "manager" ? [providerUser] : [])].filter(Boolean);
      await notify({ userIds: recipients, type: "capital.message.received", message: `New message on ${opportunity.reference}`, link: party === "provider" ? "/dashboard/capital" : "/dashboard/capital-deals" });
    } else if (party === "manager") {
      const recipient = thread.kind === "enterprise_manager" ? enterpriseUser : providerUser;
      if (recipient) await notify({ userIds: [recipient], type: "capital.message.received", message: `Anza sent you a message on ${opportunity.reference}`, link: thread.kind === "enterprise_manager" ? "/dashboard/capital" : "/dashboard/capital-deals" });
    } else {
      await notifyManagers({ managerId: opportunity.assignedManagerId, type: "capital.message.received", message: `${party === "enterprise" ? opportunity.Business.name : opportunity.CapitalProvider.name} wrote to Anza on ${opportunity.reference}`, link: managerLink });
    }

    successResponse(res, shapeMessage({ ...message.toJSON(), sender: { uuid: req.user.uuid, name: req.user.name } }, { party, userId: req.user.id }));
  } catch (error) {
    await transaction.rollback();
    errorResponse(res, error);
  }
};

const moderateMessage = async (req, res) => {
  const transaction = await sequelize.transaction();
  const refuse = async (code, message) => {
    await transaction.rollback();
    return fail(res, code, message);
  };

  try {
    const { decision, body, note } = req.body;
    if (!["approve", "edit", "reject"].includes(decision)) return refuse(400, "Decision must be approve, edit or reject");

    const message = await CapitalMessage.findOne({
      where: { uuid: req.params.uuid },
      include: [{ model: CapitalThread, include: [{ model: CapitalOpportunity, include: opportunityInclude }] }],
      transaction,
    });
    if (!message) return refuse(404, "Message not found");
    if (message.status !== "pending_approval") return refuse(409, "This message is not waiting for approval");

    const opportunity = message.CapitalThread.CapitalOpportunity;
    const before = { status: message.status, body: message.body };
    const values = { moderatedById: req.user.id, moderatedAt: new Date() };

    if (decision === "approve") values.status = "delivered";
    if (decision === "edit") {
      const edited = String(body || "").trim();
      if (!edited) return refuse(400, "Write the edited message");
      Object.assign(values, { status: "delivered", originalBody: message.body, body: edited, moderationNote: note || null });
    }
    if (decision === "reject") {
      if (!String(note || "").trim()) return refuse(400, "Tell the sender why the message was not delivered");
      Object.assign(values, { status: "rejected", moderationNote: String(note).trim() });
    }

    await message.update(values, { transaction });

    if (decision !== "approve") {
      await CapitalIntervention.create({
        capitalOpportunityId: opportunity.id,
        action: decision === "edit" ? "message_edited" : "message_rejected",
        reason: note || (decision === "edit" ? "Edited before delivery" : "Rejected"),
        previousStatus: "pending_approval",
        newStatus: values.status,
        userId: req.user.id,
      }, { transaction });
    }

    await transaction.commit();

    await audit(req, {
      action: `${decision === "approve" ? "Approved" : decision === "edit" ? "Edited and delivered" : "Rejected"} a moderated message on ${opportunity.reference}`,
      actionKey: `communication.${decision}`,
      entity: { type: "capital_message", id: message.id, uuid: message.uuid },
      opportunity,
      oldValue: before,
      newValue: { status: message.status, body: message.body },
      details: note ? { note } : undefined,
    }, { strict: true });

    const senderIsEnterprise = message.senderId === opportunity.Business.userId;
    const recipient = senderIsEnterprise ? opportunity.CapitalProvider.userId : opportunity.Business.userId;
    if (message.status === "delivered" && recipient) {
      await notify({ userIds: [recipient], type: "capital.message.received", message: `New message on ${opportunity.reference}`, link: senderIsEnterprise ? "/dashboard/capital-deals" : "/dashboard/capital" });
    }
    if (decision !== "approve" && message.senderId) {
      await notify({ userIds: [message.senderId], type: `capital.message.${decision === "edit" ? "edited" : "rejected"}`, message: `Anza ${decision === "edit" ? "edited" : "did not deliver"} your message on ${opportunity.reference}`, link: senderIsEnterprise ? "/dashboard/capital" : "/dashboard/capital-deals" });
    }

    successResponse(res, { uuid: message.uuid, status: message.status });
  } catch (error) {
    await transaction.rollback();
    errorResponse(res, error);
  }
};

module.exports = {
  partyOf,
  communicationCentre,
  moderationQueue,
  opportunityThreads,
  getThread,
  postMessage,
  moderateMessage,
};
