"use strict";
const { Model } = require("sequelize");

// A programme a startup enrols in (Climate Launchpad, Pesatech Accelerator,
// ...). Owned entirely by the "Startups by program" feature — deliberately
// NOT the shared Programs table, which holds learn-and-grow courses, Grant
// Management programs and the BDA's mentorship programs.
module.exports = (sequelize, DataTypes) => {
  class CohortProgram extends Model {
    static associate(models) {
      CohortProgram.belongsTo(models.CohortProgram, {
        foreignKey: "parentProgrammeId",
        as: "Programme",
      });
      CohortProgram.hasMany(models.CohortProgram, {
        foreignKey: "parentProgrammeId",
        as: "Cohorts",
      });
      CohortProgram.hasMany(models.CohortMembership, {
        foreignKey: "cohortProgramId",
        sourceKey: "id",
        onDelete: "CASCADE",
      });
      // The staff running this programme, and who get told about it.
      CohortProgram.hasMany(models.CohortProgramLead, {
        foreignKey: "cohortProgramId",
        sourceKey: "id",
        onDelete: "CASCADE",
      });
      // Classes this cohort has been given access to.
      CohortProgram.hasMany(models.CourseProgramAccess, {
        foreignKey: "cohortProgramId",
        onDelete: "cascade",
      });

      CohortProgram.hasMany(models.ClassProgramAccess, {
        foreignKey: "cohortProgramId",
        sourceKey: "id",
        onDelete: "CASCADE",
      });
    }
  }

  CohortProgram.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      image: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      category: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      startDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      endDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      parentProgrammeId: { type: DataTypes.INTEGER, allowNull: true },
      recordType: { type: DataTypes.STRING, allowNull: false, defaultValue: "programme" },
      objective: { type: DataTypes.TEXT, allowNull: true },
      partner: { type: DataTypes.STRING, allowNull: true },
      geographicScope: { type: DataTypes.STRING, allowNull: true },
      programmeManagerId: { type: DataTypes.INTEGER, allowNull: true },
      reportingFrequency: { type: DataTypes.STRING, allowNull: false, defaultValue: "quarterly" },
      targetParticipants: { type: DataTypes.INTEGER, allowNull: true },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: "active" },
      archivedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "CohortProgram",
      tableName: "cohort_programs",
    },
  );

  return CohortProgram;
};
