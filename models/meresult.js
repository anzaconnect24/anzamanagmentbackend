"use strict";
const { Model } = require("sequelize");

// An outcome or an output. Outputs hang off their outcome through parentId,
// so the whole logframe is one self-referencing tree.
module.exports = (sequelize, DataTypes) => {
  class MeResult extends Model {
    static associate(models) {
      MeResult.belongsTo(models.MeFramework, {
        foreignKey: "frameworkId",
        targetKey: "id",
      });
      MeResult.belongsTo(models.MeResult, {
        foreignKey: "parentId",
        targetKey: "id",
        as: "parent",
      });
      MeResult.hasMany(models.MeResult, {
        foreignKey: "parentId",
        sourceKey: "id",
        as: "children",
      });
      MeResult.hasMany(models.MeIndicator, {
        foreignKey: "resultId",
        sourceKey: "id",
      });
    }
  }

  MeResult.LEVELS = ["outcome", "output"];

  MeResult.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      frameworkId: { type: DataTypes.INTEGER, allowNull: false },
      parentId: { type: DataTypes.INTEGER, allowNull: true },
      level: {
        type: DataTypes.ENUM("outcome", "output"),
        allowNull: false,
        defaultValue: "outcome",
      },
      code: { type: DataTypes.STRING, allowNull: true },
      title: { type: DataTypes.TEXT, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      position: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      archivedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: "MeResult", tableName: "me_results" },
  );

  return MeResult;
};
