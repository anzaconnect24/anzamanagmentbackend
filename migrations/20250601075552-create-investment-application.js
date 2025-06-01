"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable("InvestmentApplications", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
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
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
    });
  },
  async down(queryInterface, DataTypes) {
    await queryInterface.dropTable("InvestmentApplications");
  },
};
