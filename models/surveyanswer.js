"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class SurveyAnswer extends Model {
    static associate(models) {
      SurveyAnswer.belongsTo(models.SurveyResponse, {
        foreignKey: "responseId",
        targetKey: "id",
      });
      SurveyAnswer.belongsTo(models.SurveyQuestion, {
        foreignKey: "questionId",
        targetKey: "id",
      });
    }
  }

  SurveyAnswer.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      responseId: { type: DataTypes.INTEGER, allowNull: false },
      questionId: { type: DataTypes.INTEGER, allowNull: false },
      // Whichever of these three fits the question's type.
      answerText: { type: DataTypes.TEXT, allowNull: true },
      selectedOptions: {
        type: DataTypes.JSON,
        allowNull: true,
      // This MySQL maps JSON columns to longtext and hands the value back as
      // text, so parse it rather than leaving callers with a string.
      get() {
        const raw = this.getDataValue("selectedOptions");
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
      rating: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      sequelize,
      modelName: "SurveyAnswer",
      tableName: "survey_answers",
    },
  );

  return SurveyAnswer;
};
