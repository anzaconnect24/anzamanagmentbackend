"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class TrackerSession extends Model {
    static associate(models) {
      TrackerSession.belongsTo(models.TrackerEnterprise, {
        foreignKey: "enterpriseId",
      });
      TrackerSession.belongsTo(models.User, {
        as: "Mentor",
        foreignKey: "mentorId",
      });
      TrackerSession.belongsTo(models.User, {
        as: "Entreprenuer",
        foreignKey: "entreprenuerId",
      });
      TrackerSession.belongsTo(models.Business, {
        foreignKey: "businessId",
      });
      TrackerSession.belongsTo(models.User, {
        as: "Creator",
        foreignKey: "createdById",
      });
    }
  }

  TrackerSession.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      enterpriseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
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
      sessionDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      facilitator: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      sessionType: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      issuesDiscussed: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      recommendationsGiven: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      actionsAgreed: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      nextSessionDate: {
        type: DataTypes.DATEONLY,
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
      modelName: "TrackerSession",
    },
  );

  return TrackerSession;
};
