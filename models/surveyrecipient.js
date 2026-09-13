"use strict";
const { Model } = require("sequelize");

// One person a survey was sent to by name. Only surveys whose audience is
// "users" have these rows; the other audiences are worked out from programme
// membership or role.
module.exports = (sequelize, DataTypes) => {
  class SurveyRecipient extends Model {
    static associate(models) {
      SurveyRecipient.belongsTo(models.Survey, {
        foreignKey: "surveyId",
        targetKey: "id",
      });
      SurveyRecipient.belongsTo(models.User, {
        foreignKey: "userId",
        as: "user",
      });
    }
  }

  SurveyRecipient.init(
    {
      surveyId: { type: DataTypes.INTEGER, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      modelName: "SurveyRecipient",
      tableName: "survey_recipients",
    },
  );

  return SurveyRecipient;
};
