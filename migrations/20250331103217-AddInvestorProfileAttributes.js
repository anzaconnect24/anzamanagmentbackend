"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.changeColumn("InvestorProfiles", "uuid", {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: true,
    });

    await queryInterface.changeColumn("InvestorProfiles", "userId", {
      type: DataTypes.INTEGER,
      allowNull: true,
    });

    await queryInterface.changeColumn("InvestorProfiles", "company", {
      type: DataTypes.STRING,
      allowNull: true,
    });

    await queryInterface.changeColumn("InvestorProfiles", "role", {
      type: DataTypes.STRING,
      allowNull: true,
    });

    await queryInterface.changeColumn("InvestorProfiles", "BusinessSectorId", {
      type: DataTypes.INTEGER,
      allowNull: true,
    });

    await queryInterface.changeColumn("InvestorProfiles", "geography", {
      type: DataTypes.STRING,
      allowNull: true,
    });

    await queryInterface.changeColumn("InvestorProfiles", "ticketSize", {
      type: DataTypes.STRING,
      allowNull: true,
    });

    await queryInterface.changeColumn("InvestorProfiles", "structure", {
      type: DataTypes.ENUM("equity", "debt", "mezzanine"),
      allowNull: true,
    });

    // Adding new columns with allowNull: true
    await queryInterface.addColumn("InvestorProfiles", "linkedinURL", {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    });

    await queryInterface.addColumn("InvestorProfiles", "website", {
      type: DataTypes.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("InvestorProfiles", "investmentFocus", {
      type: DataTypes.JSON,
      allowNull: true,
    });

    await queryInterface.addColumn("InvestorProfiles", "investmentSize", {
      type: DataTypes.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("InvestorProfiles", "investmentType", {
      type: DataTypes.JSON,
      allowNull: true,
    });

    await queryInterface.addColumn("InvestorProfiles", "bio", {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    });

    await queryInterface.addColumn("InvestorProfiles", "notableInvestment", {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    });

    await queryInterface.addColumn("InvestorProfiles", "preferMentoring", {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    });

    await queryInterface.addColumn("InvestorProfiles", "portifolioDocument", {
      type: DataTypes.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, DataTypes) {
    await queryInterface.changeColumn("InvestorProfiles", "uuid", {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    });

    await queryInterface.changeColumn("InvestorProfiles", "userId", {
      type: DataTypes.INTEGER,
      allowNull: false,
    });

    await queryInterface.changeColumn("InvestorProfiles", "company", {
      type: DataTypes.STRING,
      allowNull: false,
    });

    await queryInterface.changeColumn("InvestorProfiles", "role", {
      type: DataTypes.STRING,
      allowNull: false,
    });

    await queryInterface.changeColumn("InvestorProfiles", "BusinessSectorId", {
      type: DataTypes.INTEGER,
      allowNull: false,
    });

    await queryInterface.changeColumn("InvestorProfiles", "geography", {
      type: DataTypes.STRING,
      allowNull: false,
    });

    await queryInterface.changeColumn("InvestorProfiles", "ticketSize", {
      type: DataTypes.STRING,
      allowNull: false,
    });

    await queryInterface.changeColumn("InvestorProfiles", "structure", {
      type: DataTypes.ENUM("equity", "debt", "mezzanine"),
      allowNull: false,
    });

    // Removing newly added columns
    await queryInterface.removeColumn("InvestorProfiles", "linkedinURL");
    await queryInterface.removeColumn("InvestorProfiles", "website");
    await queryInterface.removeColumn("InvestorProfiles", "investmentFocus");
    await queryInterface.removeColumn("InvestorProfiles", "investmentSize");
    await queryInterface.removeColumn("InvestorProfiles", "investmentType");
    await queryInterface.removeColumn("InvestorProfiles", "bio");
    await queryInterface.removeColumn("InvestorProfiles", "notableInvestment");
    await queryInterface.removeColumn("InvestorProfiles", "preferMentoring");
    await queryInterface.removeColumn("InvestorProfiles", "portifolioDocument");
  },
};
