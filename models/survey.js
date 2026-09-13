"use strict";
const { Model } = require("sequelize");

// A survey, and who it is for. It either belongs to one programme and goes to
// that programme's startups, or reaches beyond a programme: to every startup
// on the platform, or to people chosen by name.
module.exports = (sequelize, DataTypes) => {
  class Survey extends Model {
    static associate(models) {
      Survey.belongsTo(models.CohortProgram, {
        foreignKey: "cohortProgramId",
        targetKey: "id",
      });
      Survey.hasMany(models.SurveyQuestion, {
        foreignKey: "surveyId",
        sourceKey: "id",
        onDelete: "CASCADE",
      });
      Survey.hasMany(models.SurveyResponse, {
        foreignKey: "surveyId",
        sourceKey: "id",
        onDelete: "CASCADE",
      });
      Survey.hasMany(models.SurveyRecipient, {
        foreignKey: "surveyId",
        sourceKey: "id",
        as: "recipients",
        onDelete: "CASCADE",
      });
      Survey.belongsTo(models.User, {
        foreignKey: "createdById",
        as: "creator",
      });
    }
  }

  Survey.STATUSES = ["draft", "published", "closed"];

  // program      - the startups on cohortProgramId
  // all_startups - every startup account on the platform
  // users        - the people in survey_recipients
  Survey.AUDIENCES = ["program", "all_startups", "users"];

  Survey.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      // Null for a survey that reaches beyond one programme.
      cohortProgramId: { type: DataTypes.INTEGER, allowNull: true },
      audience: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "program",
      },
      title: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.ENUM("draft", "published", "closed"),
        allowNull: false,
        defaultValue: "draft",
      },
      createdById: { type: DataTypes.INTEGER, allowNull: true },
    },
    { sequelize, modelName: "Survey", tableName: "surveys" },
  );

  return Survey;
};
