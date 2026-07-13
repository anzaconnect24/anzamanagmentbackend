"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Milestone extends Model {
    static associate(models) {
      Milestone.belongsTo(models.User, {
        as: "Mentor",
        foreignKey: "mentorId",
      });
      Milestone.belongsTo(models.User, {
        as: "Entreprenuer",
        foreignKey: "entreprenuerId",
      });
      Milestone.belongsTo(models.User, {
        as: "Reviewer",
        foreignKey: "reviewedById",
      });
      Milestone.belongsTo(models.Business, {
        foreignKey: "businessId",
      });
    }
  }

  Milestone.init(
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
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      dueDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      linkedTranche: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      trancheAmount: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: true,
      },
      tranchePlannedUse: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      kpiPlan: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      planStatus: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      verificationStatus: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      verificationRequested: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      disbursed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      status: {
        type: DataTypes.ENUM(
          "pending",
          "in_progress",
          "submitted",
          "completed",
          "overdue",
          "rejected",
        ),
        defaultValue: "pending",
      },
      submissionNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      submissionAttachments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      submissionDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      mentorReviewNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      reviewedById: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      reviewedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Milestone",
    },
  );

  return Milestone;
};
