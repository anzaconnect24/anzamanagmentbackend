"use strict";
const { Model } = require("sequelize");

// One submission for one survey. A startup answers once per business - the
// unique index on (surveyId, businessId) holds that. Anyone who runs no
// business (a mentor or investor a survey was sent to by name) answers once per
// account, which the controller checks by userId.
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
      // The account that submitted, which is the only name there is for a
      // respondent without a business.
      SurveyResponse.belongsTo(models.User, {
        foreignKey: "userId",
        as: "respondent",
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
