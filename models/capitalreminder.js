"use strict";
const { Model } = require("sequelize");

// A scheduled notification that has already gone out, keyed by what it was
// about (for example "stale:CAP-2026-0041:2026-09-14"). The sweep checks here
// first, so a reminder is sent once rather than on every run.
module.exports = (sequelize, DataTypes) => {
  class CapitalReminder extends Model {}

  CapitalReminder.init(
    {
      key: { type: DataTypes.STRING(191), allowNull: false, unique: true },
    },
    { sequelize, modelName: "CapitalReminder", tableName: "capital_reminders" },
  );

  return CapitalReminder;
};
