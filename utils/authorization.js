const { User } = require("../models");

const forbidden = (
  res,
  message = "You are not allowed to perform this action",
) => {
  return res.status(403).json({
    status: false,
    message,
  });
};

const notFound = (res, message = "Resource not found") => {
  return res.status(404).json({
    status: false,
    message,
  });
};

const getUserRole = async (req) => {
  if (req.user && req.user.role) {
    return req.user.role;
  }

  if (!req.user || !req.user.id) {
    return null;
  }

  const dbUser = await User.findByPk(req.user.id, {
    attributes: ["id", "role"],
  });

  if (!dbUser) {
    return null;
  }

  req.user.role = dbUser.role;
  return dbUser.role;
};

const requireRoles = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      const role = await getUserRole(req);
      if (!role || !allowedRoles.includes(role)) {
        return forbidden(res);
      }

      return next();
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "Internal server error",
        error,
      });
    }
  };
};

const requireSelfOrRoles = (paramName, allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      const role = await getUserRole(req);
      if (role && allowedRoles.includes(role)) {
        return next();
      }

      if (!req.user || !req.user.id) {
        return forbidden(res);
      }

      const uuid = req.params[paramName];
      const targetUser = await User.findOne({
        where: { uuid },
        attributes: ["id", "uuid"],
      });

      if (!targetUser) {
        return notFound(res, "User not found");
      }

      if (targetUser.id !== req.user.id) {
        return forbidden(res);
      }

      return next();
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "Internal server error",
        error,
      });
    }
  };
};

module.exports = {
  requireRoles,
  requireSelfOrRoles,
};
