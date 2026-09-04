"use strict";
const { Model } = require("sequelize");

// One startup's submission for one survey. The unique index on
// (surveyId, businessId) is what stops a startup answering twice.
module.exports = (sequelize, DataTypes) => {
  class SurveyResponse extends Model {
    static associate(models) {
      SurveyResponse.belongsTo(models.Survey, {
        foreignKey: "surveyId",
        targetKey: "id",
      });
      SurveyResponse.belongsTo(models.Business, {
        foreignKey: "businessId",
        targetKey: "id",
      });
      SurveyResponse.hasMany(models.SurveyAnswer, {
        foreignKey: "responseId",
        sourceKey: "id",
        onDelete: "CASCADE",
      });
    }
  }

  SurveyResponse.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      surveyId: { type: DataTypes.INTEGER, allowNull: false },
      businessId: { type: DataTypes.INTEGER, allowNull: true },
      userId: { type: DataTypes.INTEGER, allowNull: true },
      submittedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "SurveyResponse",
      tableName: "survey_responses",
    },
  );

  return SurveyResponse;
};
