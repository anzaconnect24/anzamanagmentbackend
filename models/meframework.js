"use strict";
const { Model } = require("sequelize");

// The M&E framework of one programme: its goal and the thresholds that decide
// indicator status. One row per cohort programme.
module.exports = (sequelize, DataTypes) => {
  class MeFramework extends Model {
    static associate(models) {
      MeFramework.belongsTo(models.CohortProgram, {
        foreignKey: "cohortProgramId",
        targetKey: "id",
      });
      MeFramework.hasMany(models.MeResult, {
        foreignKey: "frameworkId",
        sourceKey: "id",
        onDelete: "CASCADE",
      });
    }
  }

  MeFramework.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      cohortProgramId: { type: DataTypes.INTEGER, allowNull: false },
      goal: { type: DataTypes.TEXT, allowNull: true },
      onTrackThreshold: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 90,
      },
      attentionThreshold: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 70,
      },
      includeSelfReported: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdById: { type: DataTypes.INTEGER, allowNull: true },
    },
    { sequelize, modelName: "MeFramework", tableName: "me_frameworks" },
  );

  return MeFramework;
};
