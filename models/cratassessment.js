"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CratAssessment extends Model {
    static associate(models) {
      CratAssessment.belongsTo(models.Business, {
        foreignKey: "business_id",
      });
      CratAssessment.belongsTo(models.User, {
        foreignKey: "entrepreneur_id",
        as: "entrepreneur",
      });
      CratAssessment.belongsTo(models.User, {
        foreignKey: "assigned_reviewer_id",
        as: "assignedReviewer",
      });
      CratAssessment.hasMany(models.CratAnswer, {
        foreignKey: "assessment_id",
        onDelete: "CASCADE",
      });
      CratAssessment.hasMany(models.CratScoreSnapshot, {
        foreignKey: "assessment_id",
        onDelete: "CASCADE",
      });
    }
  }

  CratAssessment.init(
    {
      business_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      entrepreneur_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(
          "draft",
          "submitted",
          "assigned",
          "in_review",
          "review_submitted",
          "admin_approved",
          "admin_rejected",
          "published",
        ),
        allowNull: false,
        defaultValue: "draft",
      },
      assigned_reviewer_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      submitted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      reviewer_submitted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      admin_decided_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      admin_decision_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      published_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "CratAssessment",
      tableName: "crat_assessments",
    },
  );

  return CratAssessment;
};
