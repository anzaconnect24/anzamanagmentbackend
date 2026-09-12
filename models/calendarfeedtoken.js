"use strict";
const { Model } = require("sequelize");

// The secret that lets a calendar app read one person's calendar.
//
// Google and Outlook fetch a subscribed URL on their own schedule, with no
// session and no chance to sign in, so the URL has to carry its own proof.
// That makes the token a password in a link: it is never shown beside anything
// else, it can be rolled without touching the account, and deleting the row
// revokes it outright.
module.exports = (sequelize, DataTypes) => {
  class CalendarFeedToken extends Model {
    static associate(models) {
      CalendarFeedToken.belongsTo(models.User, {
        foreignKey: "userId",
        as: "user",
      });
    }
  }

  CalendarFeedToken.init(
    {
      userId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      token: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      lastUsedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "CalendarFeedToken",
      tableName: "calendar_feed_tokens",
    },
  );

  return CalendarFeedToken;
};
