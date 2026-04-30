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
      score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
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
