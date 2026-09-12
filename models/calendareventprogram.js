"use strict";
const { Model } = require("sequelize");

// One programme an event is published to.
module.exports = (sequelize, DataTypes) => {
  class CalendarEventProgram extends Model {
    static associate(models) {
      CalendarEventProgram.belongsTo(models.CalendarEvent, {
        foreignKey: "eventId",
        as: "event",
      });
      CalendarEventProgram.belongsTo(models.CohortProgram, {
        foreignKey: "cohortProgramId",
        as: "program",
      });
    }
  }

  CalendarEventProgram.init(
    {
      eventId: { type: DataTypes.INTEGER, allowNull: false },
      cohortProgramId: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      modelName: "CalendarEventProgram",
      tableName: "calendar_event_programs",
    },
  );

  return CalendarEventProgram;
};
