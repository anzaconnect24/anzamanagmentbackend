"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CratAnswer extends Model {
    static associate(models) {
      CratAnswer.belongsTo(models.CratAssessment, {
        foreignKey: "assessment_id",
      });
      CratAnswer.belongsTo(models.CratQuestionCatalog, {
        foreignKey: "question_id",
      });
      CratAnswer.belongsTo(models.Business, {
        foreignKey: "business_id",
      });
      CratAnswer.belongsTo(models.User, {
        foreignKey: "reviewed_by",
        as: "reviewer",
      });
    }
  }

  CratAnswer.init(
    {
      assessment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      business_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      question_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      domain: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      // The score every report and snapshot reads. It starts as the
      // applicant's own answer and becomes the AI's once scoring has run.
      score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
      // Kept separately so the applicant's own judgement is never lost, and
      // can be compared against what the AI awarded.
      self_score: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: true,
      },
      ai_score: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: true,
      },
      ai_comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      ai_scored_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      evidence: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      entrepreneur_comment: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      reviewer_comment: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      reviewed_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "CratAnswer",
      tableName: "crat_answers",
      indexes: [
        {
          unique: true,
          fields: ["assessment_id", "question_id"],
        },
      ],
    },
  );

  return CratAnswer;
};
