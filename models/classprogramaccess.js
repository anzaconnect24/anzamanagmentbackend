"use strict";
const { Model } = require("sequelize");

// Grants one programme cohort access to one class (learn-and-grow course).
// A course with no rows here is open to everyone.
module.exports = (sequelize, DataTypes) => {
  class ClassProgramAccess extends Model {
    static associate(models) {
      ClassProgramAccess.belongsTo(models.Program, {
        foreignKey: "courseId",
      });
      ClassProgramAccess.belongsTo(models.CohortProgram, {
        foreignKey: "cohortProgramId",
      });
    }
  }

  ClassProgramAccess.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      courseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      cohortProgramId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "ClassProgramAccess",
      tableName: "class_program_access",
    },
  );

  return ClassProgramAccess;
};
