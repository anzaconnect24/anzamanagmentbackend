"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class InvestmentApplication extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      InvestmentApplication.belongsTo(models.User, {
        foreignKey: "investorId",
        as: "Investor",
      });
      InvestmentApplication.belongsTo(models.User, {
        foreignKey: "entreprenuerId",
        as: "Entrepreneur",
      });
    }
  }
  InvestmentApplication.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      investorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      entreprenuerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      amount: {
        type: DataTypes.DOUBLE,
        allowNull: false,
      },
      purposeOfInvestment: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      pitchdeck: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      offerToInvestor: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("pending", "in_progress", "completed", "dropped"),
        allowNull: false,
        defaultValue: "pending",
      },
      investorStatus: {
        type: DataTypes.ENUM("pending", "interested", "approved", "rejected"),
        allowNull: false,
        defaultValue: "pending",
      },
      investorResponse: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      respondedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "InvestmentApplication",
    },
  );
  return InvestmentApplication;
};
