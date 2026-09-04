"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class SurveyQuestion extends Model {
    static associate(models) {
      SurveyQuestion.belongsTo(models.Survey, {
        foreignKey: "surveyId",
        targetKey: "id",
      });
      SurveyQuestion.hasMany(models.SurveyAnswer, {
        foreignKey: "questionId",
        sourceKey: "id",
        onDelete: "CASCADE",
      });
    }
  }

  SurveyQuestion.TYPES = ["text", "single_choice", "multiple_choice", "rating"];

  SurveyQuestion.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      surveyId: { type: DataTypes.INTEGER, allowNull: false },
      questionText: { type: DataTypes.TEXT, allowNull: false },
      questionType: {
        type: DataTypes.ENUM(
          "text",
          "single_choice",
          "multiple_choice",
          "rating",
        ),
        allowNull: false,
        defaultValue: "text",
      },
      // The choices offered, for the two choice types only.
      options: {
        type: DataTypes.JSON,
        allowNull: true,
      // This MySQL maps JSON columns to longtext and hands the value back as
      // text, so parse it rather than leaving callers with a string.
      get() {
        const raw = this.getDataValue("options");
        if (Array.isArray(raw)) return raw;
        if (typeof raw !== "string") return null;
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : null;
        } catch {
          return null;
        }
      },
      },
      required: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      position: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: "SurveyQuestion",
      tableName: "survey_questions",
    },
  );

  return SurveyQuestion;
};
