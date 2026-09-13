"use strict";
const { Model } = require("sequelize");

// One conversation on a capital opportunity. Each opportunity has at most three:
// enterprise <-> provider, and each side with the Capital Facilitation Manager.
// Kept apart from the open Chats feature, whose messages have no sender and no
// moderation, and which must not be a way round the manager.
module.exports = (sequelize, DataTypes) => {
  class CapitalThread extends Model {
    static associate(models) {
      CapitalThread.belongsTo(models.CapitalOpportunity, { foreignKey: "capitalOpportunityId" });
      CapitalThread.hasMany(models.CapitalMessage, { foreignKey: "capitalThreadId", as: "messages" });
    }
  }

  CapitalThread.KINDS = ["enterprise_provider", "enterprise_manager", "provider_manager"];

  CapitalThread.init(
    {
      uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false },
      capitalOpportunityId: { type: DataTypes.INTEGER, allowNull: false },
      kind: { type: DataTypes.STRING(30), allowNull: false },
      lastMessageAt: DataTypes.DATE,
    },
    { sequelize, modelName: "CapitalThread", tableName: "capital_threads" },
  );

  return CapitalThread;
};
