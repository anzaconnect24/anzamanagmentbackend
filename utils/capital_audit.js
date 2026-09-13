// The capital facilitation audit trail.
//
// Every consequential capital action is written here, to the existing Logs
// table with module = "capital". The Log model refuses to update or delete
// these rows, so the record is append-only.
const { Log } = require("../models");

const clientIp = (req) => {
  const forwarded = req && req.headers && req.headers["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return (req && (req.ip || (req.socket && req.socket.remoteAddress))) || null;
};

const asText = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

// Keep only the fields that actually changed, so an audit row shows the edit
// rather than two copies of the whole record.
const diff = (before = {}, after = {}) => {
  const oldValue = {};
  const newValue = {};

  for (const key of Object.keys(after)) {
    const was = before[key] === undefined ? null : before[key];
    const now = after[key] === undefined ? null : after[key];
    if (JSON.stringify(was) !== JSON.stringify(now)) {
      oldValue[key] = was;
      newValue[key] = now;
    }
  }

  return { oldValue, newValue, changed: Object.keys(newValue).length > 0 };
};

/**
 * Record one capital action.
 *
 * action       - what happened, in words ("Approved introduction")
 * actionKey    - a stable key ("introduction.approved") kept as resourceType
 * entity       - { type, id, uuid } of the record acted on
 * opportunity  - CapitalOpportunity (or { id }) the action belongs to
 * businessId   - enterprise involved
 * providerId   - capital provider involved
 * oldValue / newValue - before and after
 * details      - anything else worth keeping
 *
 * Never throws: a failure to audit is logged loudly but must not undo the
 * action the user was taking. Callers doing something that must not happen
 * unaudited pass { strict: true } and get the error back.
 */
const audit = async (req, entry, { strict = false, transaction } = {}) => {
  try {
    const user = (req && req.user) || {};

    return await Log.create(
      {
        userId: user.id || 0,
        role: user.role || null,
        module: "capital",
        actionType: "capital",
        action: String(entry.action || entry.actionKey || "capital action").slice(0, 255),
        resourceType: entry.actionKey || (entry.entity && entry.entity.type) || null,
        resourceId: (entry.entity && entry.entity.id) || null,
        resourceUuid: (entry.entity && entry.entity.uuid) || null,
        capitalOpportunityId: (entry.opportunity && entry.opportunity.id) || entry.opportunityId || null,
        businessId: entry.businessId || (entry.opportunity && entry.opportunity.businessId) || null,
        capitalProviderId: entry.providerId || (entry.opportunity && entry.opportunity.capitalProviderId) || null,
        oldValue: asText(entry.oldValue),
        newValue: asText(entry.newValue),
        metadata: asText({ entityType: entry.entity && entry.entity.type, ...(entry.details || {}) }),
        ipAddress: clientIp(req),
        userAgent: (req && req.headers && req.headers["user-agent"]) || null,
      },
      { transaction },
    );
  } catch (error) {
    console.error("CAPITAL AUDIT WRITE FAILED:", entry && entry.action, error.message);
    if (strict) throw error;
    return null;
  }
};

module.exports = { audit, diff };
