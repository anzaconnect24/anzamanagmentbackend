"use strict";
const { Model } = require("sequelize");

// A confidential internal note on a capital request, opportunity, provider or
// enterprise. Only ever returned to holders of capital.notes.manage - never to
// an enterprise or a capital provider.
module.exports = (sequelize, DataTypes) => {
  class CapitalNote extends Model {
    static associate(models) {
      CapitalNote.belongsTo(models.User, { foreignKey: "authorId", as: "author" });
    }
  }

  CapitalNote.SUBJECTS = ["request", "opportunity", "provider", "enterprise"];

  CapitalNote.init(
    {
      uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false },
      subjectType: { type: DataTypes.STRING(20), allowNull: false },
      subjectId: { type: DataTypes.INTEGER, allowNull: false },
      body: { type: DataTypes.TEXT, allowNull: false },
      authorId: DataTypes.INTEGER,
    },
    { sequelize, modelName: "CapitalNote", tableName: "capital_notes" },
  );

  return CapitalNote;
};
