"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CratReviewerScore extends Model {
    static associate(models) {
      CratReviewerScore.belongsTo(models.CratAssessment, {
        foreignKey: "assessment_id",
      });
      CratReviewerScore.belongsTo(models.CratQuestionCatalog, {
        foreignKey: "question_id",
      });
      CratReviewerScore.belongsTo(models.User, {
        foreignKey: "reviewer_id",
        as: "reviewer",
      });
    }
  }

  CratReviewerScore.init(
    {
      assessment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      question_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      reviewer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      reviewer_comment: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      submitted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "CratReviewerScore",
      tableName: "crat_reviewer_scores",
      indexes: [
        {
          unique: true,
          fields: ["assessment_id", "question_id", "reviewer_id"],
        },
      ],
    },
  );

  return CratReviewerScore;
};
