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
      CratAssessment.hasMany(models.CratAssessmentReviewer, {
        foreignKey: "assessment_id",
        as: "assignedReviewers",
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
        // The live flow is draft -> submitted -> ai_scoring -> ai_scored ->
        // published. The reviewer statuses stay for assessments that were
        // already part-way through the old staff-review flow.
        type: DataTypes.ENUM(
          "draft",
          "submitted",
          "ai_scoring",
          "ai_scored",
          "ai_failed",
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
      // The AI's written verdict on the assessment, shown to the Admin
      // deciding whether to publish it.
      ai_analysis: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      ai_scored_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      // Why scoring failed, or which questions the model skipped, so the
      // gap is visible rather than silent.
      ai_error: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // Which model produced the scores. A change of model changes what a
      // score means, so it belongs in the record.
      ai_model: {
        type: DataTypes.STRING,
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
