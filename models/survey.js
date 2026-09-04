"use strict";
const { Model } = require("sequelize");

// A survey a programme runs. Startups on the programme answer it once.
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
      Survey.belongsTo(models.User, {
        foreignKey: "createdById",
        as: "creator",
      });
    }
  }

  Survey.STATUSES = ["draft", "published", "closed"];

  Survey.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      cohortProgramId: { type: DataTypes.INTEGER, allowNull: false },
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
