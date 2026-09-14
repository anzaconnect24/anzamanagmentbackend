"use strict";
const { Model } = require("sequelize");

// A milestone or KPI a Business Development Advisor sets for a programme.
// Every startup on the programme reports against it.
module.exports = (sequelize, DataTypes) => {
  class ProgramTarget extends Model {
    static associate(models) {
      ProgramTarget.belongsTo(models.CohortProgram, {
        foreignKey: "cohortProgramId",
      });
      ProgramTarget.hasMany(models.ProgramTargetSubmission, {
        foreignKey: "targetId",
        as: "submissions",
        onDelete: "cascade",
      });
    }
  }

  ProgramTarget.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      cohortProgramId: { type: DataTypes.INTEGER, allowNull: false },
      kind: { type: DataTypes.STRING(20), allowNull: false },
      title: { type: DataTypes.STRING, allowNull: false },
      description: DataTypes.TEXT,
      unit: DataTypes.STRING(60),
      targetValue: DataTypes.STRING,
      dueDate: DataTypes.DATEONLY,
      evidenceRequired: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      createdById: DataTypes.INTEGER,
      archivedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "ProgramTarget",
      tableName: "program_targets",
    },
  );

  return ProgramTarget;
};
