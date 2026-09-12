"use strict";
const { Model } = require("sequelize");

// An entry on the platform calendar: either something a programme published
// or a reminder somebody keeps for themselves. Which it is depends only on
// who the audience is.
module.exports = (sequelize, DataTypes) => {
  class CalendarEvent extends Model {
    static associate(models) {
      CalendarEvent.belongsTo(models.User, {
        foreignKey: "createdById",
        as: "createdBy",
      });

      CalendarEvent.hasMany(models.CalendarEventProgram, {
        foreignKey: "eventId",
        as: "programs",
        onDelete: "cascade",
      });

      CalendarEvent.hasMany(models.CalendarEventUser, {
        foreignKey: "eventId",
        as: "invitees",
        onDelete: "cascade",
      });
    }
  }

  // Who may see it. "private" is the default because the safe mistake is an
  // entry nobody else sees, not one everybody does.
  CalendarEvent.VISIBILITIES = ["private", "programs", "users", "everyone"];

  // Who may publish to anyone but themselves. Everyone else keeps reminders.
  CalendarEvent.PUBLISHERS = ["Admin", "BDA"];

  CalendarEvent.COLOURS = [
    "blue",
    "green",
    "amber",
    "rose",
    "violet",
    "teal",
    "orange",
    "slate",
  ];

  CalendarEvent.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      createdById: { type: DataTypes.INTEGER, allowNull: false },
      title: { type: DataTypes.STRING, allowNull: false },
      description: DataTypes.TEXT,
      location: DataTypes.STRING,
      startDate: { type: DataTypes.DATEONLY, allowNull: false },
      endDate: DataTypes.DATEONLY,
      startTime: DataTypes.STRING,
      endTime: DataTypes.STRING,
      colour: { type: DataTypes.STRING, allowNull: false, defaultValue: "blue" },
      visibility: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "private",
      },
      archivedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "CalendarEvent",
      tableName: "calendar_events",
    },
  );

  return CalendarEvent;
};
