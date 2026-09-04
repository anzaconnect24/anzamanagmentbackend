"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Module extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Module.hasMany(models.Slide, {
        foreignKey: "moduleId",
        sourceKey: "id",
      });
      Module.belongsTo(models.Program, {
        foreignKey: "programId",
        targetKey: "id",
      });
      // A module belongs straight to the programme startups enrol in.
      Module.belongsTo(models.CohortProgram, {
        foreignKey: "cohortProgramId",
        targetKey: "id",
      });
    }
  }
  Module.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      // The course this module was authored under, before courses were
      // dropped. Null on every module created since.
      programId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "Programs",
          key: "id",
        },
      },
      cohortProgramId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      image: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Module",
    }
  );
  return Module;
};
