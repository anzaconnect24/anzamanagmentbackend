// Permission checks for capital facilitation.
//
// The rest of the API authorises by role name. Capital facilitation authorises
// by permission, so a System Administrator can change who may do what from the
// permission matrix without a code change. A user holds a permission if their
// role holds it (role_permissions) or it was granted to them directly
// (UserPermissions).
const { Op } = require("sequelize");
const { Permission, RolePermission, UserPermission, User } = require("../models");

// The role code stored in User.role for a Capital Facilitation Manager.
const CFM_ROLE = "CFM";

const roleOf = async (req) => {
  if (req.user && req.user.role) return req.user.role;
  if (!req.user || !req.user.id) return null;

  const user = await User.findByPk(req.user.id, { attributes: ["role"] });
  if (user) req.user.role = user.role;
  return user ? user.role : null;
};

// Every capital permission key this person holds, read once per request.
const permissionsOf = async (req) => {
  if (req.capitalPermissions) return req.capitalPermissions;

  const role = await roleOf(req);
  const keys = new Set();

  if (role) {
    const grants = await RolePermission.findAll({
      where: { role },
      include: [{ model: Permission, attributes: ["key"], required: true }],
    });
    for (const grant of grants) if (grant.Permission.key) keys.add(grant.Permission.key);
  }

  if (req.user && req.user.id) {
    const direct = await UserPermission.findAll({
      where: { userId: req.user.id },
      include: [{ model: Permission, attributes: ["key"], where: { key: { [Op.ne]: null } }, required: true }],
    });
    for (const grant of direct) keys.add(grant.Permission.key);
  }

  req.capitalPermissions = keys;
  return keys;
};

const can = async (req, key) => (await permissionsOf(req)).has(key);

// Route guard: the caller must hold at least one of the listed permissions.
const requirePermission = (...keys) => async (req, res, next) => {
  try {
    const held = await permissionsOf(req);
    if (keys.some((key) => held.has(key))) return next();

    return res.status(403).json({
      status: false,
      message: "You do not have permission for this capital facilitation action",
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: "Internal server error", error });
  }
};

module.exports = { CFM_ROLE, roleOf, permissionsOf, can, requirePermission };
