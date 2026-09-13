// Scheduled capital facilitation reminders: opportunities gone quiet, overdue
// due diligence, and meetings coming up.
//
// Runs hourly in the API process. Every reminder is keyed so it is sent once:
// a quiet spell is flagged once however many hours it lasts, and flagged again
// only if activity resumes and then stops again.
const { Op } = require("sequelize");
const {
  Business,
  CapitalDdItem,
  CapitalOpportunity,
  CapitalProvider,
  CapitalSetting,
} = require("../../models");
const { notify, notifyManagers, once } = require("../../utils/capital_notify");

const setting = async (key) => {
  const row = await CapitalSetting.findOne({ where: { key } });
  const value = Number(row ? row.value : CapitalSetting.DEFAULTS[key]);
  return Number.isFinite(value) && value > 0 ? value : Number(CapitalSetting.DEFAULTS[key]);
};

const link = (opportunity) => `/dashboard/capital/opportunities/${opportunity.uuid}`;

const runCapitalSweep = async () => {
  const sent = { stale: 0, overdue: 0, meetings: 0 };
  const now = new Date();

  // Quiet opportunities.
  const staleDays = await setting("staleOpportunityDays");
  const cutoff = new Date(now.getTime() - staleDays * 86400000);
  const stale = await CapitalOpportunity.findAll({
    where: {
      status: "active",
      [Op.or]: [{ lastActivityAt: { [Op.lt]: cutoff } }, { lastActivityAt: null, createdAt: { [Op.lt]: cutoff } }],
    },
    attributes: ["id", "uuid", "reference", "assignedManagerId", "lastActivityAt", "createdAt"],
  });
  for (const opportunity of stale) {
    const since = (opportunity.lastActivityAt || opportunity.createdAt).toISOString().slice(0, 10);
    if (await once(`stale:${opportunity.reference}:${since}`, () =>
      notifyManagers({ managerId: opportunity.assignedManagerId, type: "capital.opportunity.stale", message: `${opportunity.reference} has had no activity for ${staleDays}+ days`, link: link(opportunity) }))) {
      sent.stale += 1;
    }
  }

  // Overdue due diligence, once per item per due date.
  const today = now.toISOString().slice(0, 10);
  const overdue = await CapitalDdItem.findAll({
    where: { dueDate: { [Op.lt]: today }, status: { [Op.notIn]: CapitalDdItem.DONE } },
    include: [{ model: CapitalOpportunity, attributes: ["uuid", "reference", "assignedManagerId", "status"], where: { status: "active" } }],
  });
  for (const item of overdue) {
    const opportunity = item.CapitalOpportunity;
    if (await once(`dd-overdue:${item.uuid}:${item.dueDate}`, () =>
      notifyManagers({ managerId: opportunity.assignedManagerId, type: "capital.duediligence.overdue", message: `Overdue due diligence on ${opportunity.reference}: ${item.requirement.slice(0, 100)}`, link: link(opportunity) }))) {
      sent.overdue += 1;
    }
  }

  // Meetings coming up, for the manager and both parties.
  const hours = await setting("meetingReminderHours");
  const horizon = new Date(now.getTime() + hours * 3600000);
  const meetings = await CapitalOpportunity.findAll({
    where: { status: "active", meetingAt: { [Op.between]: [now, horizon] } },
    include: [{ model: Business, attributes: ["userId", "name"] }, { model: CapitalProvider, attributes: ["userId", "name"] }],
  });
  for (const opportunity of meetings) {
    const at = opportunity.meetingAt.toLocaleString("en-GB");
    if (await once(`meeting:${opportunity.reference}:${opportunity.meetingAt.toISOString()}`, async () => {
      await notifyManagers({ managerId: opportunity.assignedManagerId, type: "capital.meeting.approaching", message: `Meeting on ${opportunity.reference} at ${at}`, link: link(opportunity) });
      await notify({ userIds: [opportunity.Business && opportunity.Business.userId, opportunity.CapitalProvider && opportunity.CapitalProvider.userId].filter(Boolean), type: "capital.meeting.approaching", message: `Reminder: meeting on ${opportunity.reference} at ${at}` });
    })) {
      sent.meetings += 1;
    }
  }

  return sent;
};

let timer = null;
let running = false;

const startCapitalSweep = ({ intervalMs = 60 * 60 * 1000, firstRunMs = 60 * 1000 } = {}) => {
  if (timer) return;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const sent = await runCapitalSweep();
      if (sent.stale || sent.overdue || sent.meetings) console.log("Capital reminders sent:", sent);
    } catch (error) {
      console.error("Capital reminder sweep failed:", error.message);
    } finally {
      running = false;
    }
  };

  setTimeout(tick, firstRunMs).unref();
  timer = setInterval(tick, intervalMs);
  timer.unref();
};

module.exports = { runCapitalSweep, startCapitalSweep };
