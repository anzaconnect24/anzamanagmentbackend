"use strict";
const { Model } = require("sequelize");

// Tunable values for capital facilitation, such as how many quiet days make
// an opportunity stale.
module.exports = (sequelize, DataTypes) => {
  class CapitalSetting extends Model {}

  CapitalSetting.DEFAULTS = {
    staleOpportunityDays: "14",
    meetingReminderHours: "24",
  };

  CapitalSetting.init(
    {
      key: { type: DataTypes.STRING(80), allowNull: false, unique: true },
      value: DataTypes.TEXT,
      updatedById: DataTypes.INTEGER,
    },
    { sequelize, modelName: "CapitalSetting", tableName: "capital_settings" },
  );

  return CapitalSetting;
};
