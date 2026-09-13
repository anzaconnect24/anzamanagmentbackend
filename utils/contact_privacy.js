// Contact privacy between enterprises and capital providers.
//
// Anza's Capital Facilitation Manager is the gatekeeper between startups and
// investors, so neither side may read the other's email or phone through the
// platform until an introduction between them has been approved. Other roles
// are unaffected. A password hash is never returned to anyone.
const { Op } = require("sequelize");
const { Business, CapitalOpportunity, CapitalProvider, User } = require("../models");

// Whose contacts are guarded from whom.
const COUNTERPART = { Enterprenuer: "Investor", Investor: "Enterprenuer" };

const roleOf = async (viewer) => {
  if (!viewer) return null;
  if (viewer.role) return viewer.role;
  if (!viewer.id) return null;
  const row = await User.findByPk(viewer.id, { attributes: ["role"] });
  return row ? row.role : null;
};

const LIVE = { introductionApprovedAt: { [Op.ne]: null }, status: { [Op.in]: ["active", "won"] } };

// The accounts whose contacts this viewer may see through an approved
// introduction.
const introducedUserIds = async (viewer, role) => {
  const ids = new Set();

  if (role === "Enterprenuer") {
    const business = await Business.findOne({ where: { userId: viewer.id }, attributes: ["id"] });
    if (!business) return ids;
    const rows = await CapitalOpportunity.findAll({
      where: { businessId: business.id, ...LIVE },
      attributes: ["id"],
      include: [{ model: CapitalProvider, attributes: ["userId"] }],
    });
    for (const row of rows) if (row.CapitalProvider && row.CapitalProvider.userId) ids.add(row.CapitalProvider.userId);
  }

  if (role === "Investor") {
    const provider = await CapitalProvider.findOne({ where: { userId: viewer.id }, attributes: ["id"] });
    if (!provider) return ids;
    const rows = await CapitalOpportunity.findAll({
      where: { capitalProviderId: provider.id, ...LIVE },
      attributes: ["id"],
      include: [{ model: Business, attributes: ["userId"] }],
    });
    for (const row of rows) if (row.Business && row.Business.userId) ids.add(row.Business.userId);
  }

  return ids;
};

const strip = (data, hideContacts) => {
  if (!data) return data;
  delete data.password;
  if (hideContacts) {
    delete data.email;
    delete data.phone;
    if (data.Business) {
      delete data.Business.email;
      delete data.Business.phone;
    }
  }
  return data;
};

const plain = (row) => (row && row.toJSON ? row.toJSON() : row);

// A list of users of one role, as this viewer may see them.
const maskContacts = async (viewer, rows, targetRole) => {
  const role = await roleOf(viewer);
  const guarded = COUNTERPART[role] === targetRole;
  const allowed = guarded ? await introducedUserIds(viewer, role) : null;

  return (rows || []).map((row) => {
    const data = plain(row);
    return strip(data, guarded && !!data && !allowed.has(data.id));
  });
};

// One user, as this viewer may see them.
const maskContact = async (viewer, user) => {
  const data = plain(user);
  if (!data) return data;

  const role = await roleOf(viewer);
  const guarded = COUNTERPART[role] === data.role && data.id !== (viewer && viewer.id);
  if (!guarded) return strip(data, false);

  const allowed = await introducedUserIds(viewer, role);
  return strip(data, !allowed.has(data.id));
};

module.exports = { maskContact, maskContacts };
