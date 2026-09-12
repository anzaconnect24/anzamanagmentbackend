"use strict";
const { Model } = require("sequelize");

// One activity on the workplan. Its dates are what shade the timeline grid:
// the week columns are derived from them when the plan is drawn, so nothing
// has to be renumbered if the programme shifts.
module.exports = (sequelize, DataTypes) => {
  class ProgramWorkplanActivity extends Model {
    static associate(models) {
      ProgramWorkplanActivity.belongsTo(models.ProgramWorkplanOutput, {
        foreignKey: "outputId",
      });
      ProgramWorkplanActivity.belongsTo(models.User, {
        foreignKey: "ownerId",
        as: "owner",
      });
    }
  }

  ProgramWorkplanActivity.STATUSES = [
    "planned",
    "in_progress",
    "completed",
    "cancelled",
  ];

  ProgramWorkplanActivity.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      outputId: { type: DataTypes.INTEGER, allowNull: false },
      title: { type: DataTypes.TEXT, allowNull: false },
      startDate: DataTypes.DATEONLY,
      endDate: DataTypes.DATEONLY,
      ownerId: DataTypes.INTEGER,
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "planned",
      },
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      sequelize,
      modelName: "ProgramWorkplanActivity",
      tableName: "program_workplan_activities",
    },
  );

  return ProgramWorkplanActivity;
};
