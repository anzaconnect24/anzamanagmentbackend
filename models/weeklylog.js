"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class WeeklyLog extends Model {
    static associate(models) {
      WeeklyLog.belongsTo(models.User, {
        as: "Mentor",
        foreignKey: "mentorId",
      });
      WeeklyLog.belongsTo(models.User, {
        as: "Entreprenuer",
        foreignKey: "entreprenuerId",
      });
      WeeklyLog.belongsTo(models.User, {
        as: "Creator",
        foreignKey: "createdById",
      });
      WeeklyLog.belongsTo(models.Business, {
        foreignKey: "businessId",
      });
    }
  }

  WeeklyLog.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      mentorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      entreprenuerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      businessId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      createdById: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      weekStart: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      facilitator: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      hours: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: false,
        defaultValue: 0,
      },
      touchpoints: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      activities: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      focus: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      outcomes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      barriers: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      nextPlan: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      engagement: {
        type: DataTypes.ENUM("high", "medium", "low"),
        allowNull: true,
      },
      flag: {
        type: DataTypes.ENUM("green", "amber", "red"),
        allowNull: false,
        defaultValue: "green",
      },
    },
    {
      sequelize,
      modelName: "WeeklyLog",
      indexes: [
        {
          unique: true,
          fields: ["mentorId", "entreprenuerId", "weekStart"],
        },
      ],
    },
  );

  return WeeklyLog;
};
