"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class TrackerSession extends Model {
    static associate(models) {
      TrackerSession.belongsTo(models.CohortProgram, {
        foreignKey: "cohortProgramId",
      });
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
      // Null when the session belongs to a programme rather than to a
      // grant-tracker enterprise.
      enterpriseId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      // The programme this coaching session was run under.
      cohortProgramId: {
        type: DataTypes.INTEGER,
        allowNull: true,
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
      // The session's own name; the history panel shows it in place of the
      // session type when set.
      title: {
        type: DataTypes.STRING,
        allowNull: true,
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
      durationMinutes: DataTypes.INTEGER,
      mode: DataTypes.STRING,
      topic: DataTypes.STRING,
      challengeIdentified: DataTypes.TEXT,
      actionOwner: DataTypes.STRING,
      actionDeadline: DataTypes.DATEONLY,
      actionStatus: { type: DataTypes.STRING, allowNull: false, defaultValue: "not_started" },
      notes: DataTypes.TEXT,
      evidenceUrl: DataTypes.TEXT,
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
      // Private notes on a confidential session are withheld from everyone
      // but the coach who wrote them and Admin.
      confidential: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
