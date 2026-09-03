"use strict";
const { Model } = require("sequelize");

// A programme a startup enrols in (Climate Launchpad, Pesatech Accelerator,
// ...). Owned entirely by the "Startups by program" feature — deliberately
// NOT the shared Programs table, which holds learn-and-grow courses, Grant
// Management programs and the BDA's mentorship programs.
module.exports = (sequelize, DataTypes) => {
  class CohortProgram extends Model {
    static associate(models) {
      CohortProgram.hasMany(models.CohortMembership, {
        foreignKey: "cohortProgramId",
        sourceKey: "id",
        onDelete: "CASCADE",
      });
      // Classes this cohort has been given access to.
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
    },
    {
      sequelize,
      modelName: "CohortProgram",
      tableName: "cohort_programs",
    },
  );

  return CohortProgram;
};
