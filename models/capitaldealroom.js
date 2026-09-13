"use strict";
const { Model } = require("sequelize");

// The shared document space for one opportunity, opened once a capital
// provider is seriously interested. Each document in it carries its own
// visibility; the room only groups them.
module.exports = (sequelize, DataTypes) => {
  class CapitalDealRoom extends Model {
    static associate(models) {
      CapitalDealRoom.belongsTo(models.CapitalOpportunity, { foreignKey: "capitalOpportunityId" });
      CapitalDealRoom.belongsTo(models.User, { foreignKey: "createdById", as: "createdBy" });
      CapitalDealRoom.hasMany(models.CapitalDocument, { foreignKey: "capitalDealRoomId", as: "documents" });
    }
  }

  CapitalDealRoom.init(
    {
      uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false },
      capitalOpportunityId: { type: DataTypes.INTEGER, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "open" },
      createdById: DataTypes.INTEGER,
    },
    { sequelize, modelName: "CapitalDealRoom", tableName: "capital_deal_rooms" },
  );

  return CapitalDealRoom;
};
