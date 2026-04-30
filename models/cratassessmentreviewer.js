"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CratAssessmentReviewer extends Model {
    static associate(models) {
      CratAssessmentReviewer.belongsTo(models.CratAssessment, {
        foreignKey: "assessment_id",
      });
      CratAssessmentReviewer.belongsTo(models.User, {
        foreignKey: "reviewer_id",
        as: "reviewer",
      });
    }
  }

  CratAssessmentReviewer.init(
    {
      assessment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      reviewer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      assigned_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      submitted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "CratAssessmentReviewer",
      tableName: "crat_assessment_reviewers",
    },
  );

  return CratAssessmentReviewer;
};
