"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class InvestorProfile extends Model {
    static associate(models) {
      InvestorProfile.belongsTo(models.User);
      InvestorProfile.belongsTo(models.BusinessSector);
    }
  }

  InvestorProfile.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      company: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      role: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      BusinessSectorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      geography: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      ticketSize: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      structure: {
        type: DataTypes.ENUM("equity", "debt", "mezzanine"),
        allowNull: true,
      },

      // Added attributes
      linkedinURL: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      seeking: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      website: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      investmentFocus: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      investmentSize: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      investmentType: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      bio: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      notableInvestment: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      preferMentoring: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
      portifolioDocument: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "InvestorProfile",
    }
  );

  return InvestorProfile;
};
