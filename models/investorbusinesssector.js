"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class InvestorBusinessSector extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  InvestorBusinessSector.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      businessSectorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      investorProfileId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "InvestorBusinessSector",
    }
  );
  return InvestorBusinessSector;
};
