"use strict";
const { Model } = require("sequelize");

// One person an event is published to by name, and what they said about it.
//
// Being named is an invitation, so it carries an answer. "pending" is the
// answer nobody has given yet, which is what the Invites tab is counting.
module.exports = (sequelize, DataTypes) => {
  class CalendarEventUser extends Model {
    static associate(models) {
      CalendarEventUser.belongsTo(models.CalendarEvent, {
        foreignKey: "eventId",
        as: "event",
      });
      CalendarEventUser.belongsTo(models.User, {
        foreignKey: "userId",
        as: "user",
      });
    }
  }

  CalendarEventUser.RESPONSES = ["pending", "accepted", "declined", "tentative"];

  CalendarEventUser.init(
    {
      eventId: { type: DataTypes.INTEGER, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      response: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "pending",
      },
      respondedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "CalendarEventUser",
      tableName: "calendar_event_users",
    },
  );

  return CalendarEventUser;
};
