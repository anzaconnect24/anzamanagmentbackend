// Notifications for capital facilitation, through the existing Notification
// table: addressed either to one user or to everyone in a role, which is how
// the header's notification list already reads them.
const { Notification, CapitalReminder } = require("../models");
const { CFM_ROLE } = require("./capital_access");

const clip = (text) => String(text || "").slice(0, 255);

const notify = async ({ userIds = [], toRole = null, type, message, link = null }) => {
  try {
    const rows = [...new Set(userIds.filter(Boolean))].map((userId) => ({
      userId,
      message: clip(message),
      type,
      link,
    }));

    if (toRole) rows.push({ to: toRole, message: clip(message), type, link });
    if (rows.length) await Notification.bulkCreate(rows);
  } catch (error) {
    // A notification failing must never undo the action it announces.
    console.error("Capital notification failed:", type, error.message);
  }
};

// The assigned manager if there is one, otherwise every Capital Facilitation
// Manager - so nothing lands in nobody's queue.
const notifyManagers = ({ managerId = null, type, message, link }) =>
  managerId
    ? notify({ userIds: [managerId], type, message, link })
    : notify({ toRole: CFM_ROLE, type, message, link });

// Run a scheduled notification once per key. The key is inserted first; if
// another run already inserted it, the unique index refuses and nothing is sent.
const once = async (key, send) => {
  try {
    await CapitalReminder.create({ key: String(key).slice(0, 191) });
  } catch (error) {
    if (error && error.name === "SequelizeUniqueConstraintError") return false;
    throw error;
  }
  await send();
  return true;
};

module.exports = { notify, notifyManagers, once };
