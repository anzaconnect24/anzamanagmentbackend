"use strict";
const { Model } = require("sequelize");

// One output on a programme workplan — the banner row, with the activities
// that deliver it hanging beneath.
module.exports = (sequelize, DataTypes) => {
  class ProgramWorkplanOutput extends Model {
    static associate(models) {
      ProgramWorkplanOutput.belongsTo(models.CohortProgram, {
        foreignKey: "cohortProgramId",
      });
      ProgramWorkplanOutput.hasMany(models.ProgramWorkplanActivity, {
        foreignKey: "outputId",
        as: "activities",
        onDelete: "cascade",
      });
    }
  }

  ProgramWorkplanOutput.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      cohortProgramId: { type: DataTypes.INTEGER, allowNull: false },
      title: { type: DataTypes.STRING, allowNull: false },
      description: DataTypes.TEXT,
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      sequelize,
      modelName: "ProgramWorkplanOutput",
      tableName: "program_workplan_outputs",
    },
  );

  return ProgramWorkplanOutput;
};
