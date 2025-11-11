const { Log, SlideReader, Module, Slide } = require("../models");
const { Op } = require("sequelize");

/**
 * Simple activity logger using existing Log table
 * Only uses userId and action fields
 */

/**
 * Log user login
 */
const logLogin = async (userId, userName = "") => {
  try {
    await Log.create({
      userId,
      action: `User ${userName || userId} logged in`,
    });
  } catch (error) {
    console.error("Error logging login:", error);
  }
};

/**
 * Log CRAT update
 */
const logCratUpdate = async (userId, cratType, subDomain, userName = "") => {
  try {
    await Log.create({
      userId,
      action: `User ${userName || userId} updated ${cratType} - ${subDomain}`,
    });
  } catch (error) {
    console.error("Error logging CRAT update:", error);
  }
};

/**
 * Log module reading start
 * Only logs once when user starts reading a new module
 */
const logModuleStart = async (
  userId,
  moduleId,
  moduleName = "",
  userName = ""
) => {
  try {
    const module = await Module.findOne({
      where: { id: moduleId },
      include: [{ model: Slide }],
    });

    if (!module) {
      console.error(`Module with ID ${moduleId} not found`);
      return;
    }

    const slideIds = module.Slides.map((slide) => slide.id);

    const existingRead = await SlideReader.findOne({
      where: {
        userId,
        slideId: {
          [Op.in]: slideIds,
        },
      },
    });

    if (!existingRead) {
      const moduleTitle = moduleName || module.title || module.course;
      await Log.create({
        userId,
        action: `User ${
          userName || userId
        } started reading module: ${moduleTitle}`,
      });
      console.log(
        `Logged module start for user ${userId}, module: ${moduleTitle}`
      );
    } else {
      console.log(
        `User ${userId} has already started module ${moduleId}, skipping log`
      );
    }
  } catch (error) {
    console.error("Error logging module start:", error);
  }
};

/**
 * Log general resource access
 */
const logResourceAccess = async (
  userId,
  resourceType,
  resourceName,
  action,
  userName = ""
) => {
  try {
    await Log.create({
      userId,
      action: `User ${
        userName || userId
      } ${action} ${resourceType}: ${resourceName}`,
    });
  } catch (error) {
    console.error("Error logging resource access:", error);
  }
};

/**
 * Get user activity logs
 */
const getUserActivityLogs = async (userId, options = {}) => {
  try {
    const {
      limit = 50,
      offset = 0,
      startDate = null,
      endDate = null,
    } = options;

    const whereClause = { userId };

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt[Op.lte] = new Date(endDate);
      }
    }

    const { count, rows } = await Log.findAndCountAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    return { count, logs: rows };
  } catch (error) {
    console.error("Error getting user activity logs:", error);
    return { count: 0, logs: [] };
  }
};

module.exports = {
  logLogin,
  logCratUpdate,
  logModuleStart,
  logResourceAccess,
  getUserActivityLogs,
};
