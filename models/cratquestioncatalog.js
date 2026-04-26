"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CratQuestionCatalog extends Model {
    static associate(models) {
      CratQuestionCatalog.hasMany(models.CratAnswer, {
        foreignKey: "question_id",
        onDelete: "CASCADE",
      });
    }
  }

  CratQuestionCatalog.init(
    {
      domain: {
        type: DataTypes.ENUM(
          "commercial_marketing",
          "financial",
          "legal_compliance",
          "operations",
        ),
        allowNull: false,
      },
      variant: {
        type: DataTypes.ENUM("default", "fintech"),
        allowNull: false,
        defaultValue: "default",
      },
      question_code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      question_text_en: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      question_text_sw: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      guidance_en: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      guidance_sw: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      required_attachment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      required_attachment_sw: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      ai_prompt: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "CratQuestionCatalog",
      tableName: "crat_question_catalog",
    },
  );

  return CratQuestionCatalog;
};
