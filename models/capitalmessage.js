"use strict";
const { Model } = require("sequelize");

// A message in a capital thread. In moderated mode a message between the
// enterprise and provider waits as pending_approval until the manager delivers,
// edits or rejects it; the text as first written is kept in originalBody so an
// edit is never silent.
module.exports = (sequelize, DataTypes) => {
  class CapitalMessage extends Model {
    static associate(models) {
      CapitalMessage.belongsTo(models.CapitalThread, { foreignKey: "capitalThreadId" });
      CapitalMessage.belongsTo(models.User, { foreignKey: "senderId", as: "sender" });
      CapitalMessage.belongsTo(models.User, { foreignKey: "moderatedById", as: "moderatedBy" });
    }
  }

  CapitalMessage.STATUSES = ["pending_approval", "delivered", "rejected"];

  CapitalMessage.init(
    {
      uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false },
      capitalThreadId: { type: DataTypes.INTEGER, allowNull: false },
      senderId: DataTypes.INTEGER,
      senderRole: DataTypes.STRING(40),
      body: { type: DataTypes.TEXT, allowNull: false },
      originalBody: DataTypes.TEXT,
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "delivered" },
      moderatedById: DataTypes.INTEGER,
      moderatedAt: DataTypes.DATE,
      moderationNote: DataTypes.TEXT,
      isIntervention: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { sequelize, modelName: "CapitalMessage", tableName: "capital_messages" },
  );

  return CapitalMessage;
};
