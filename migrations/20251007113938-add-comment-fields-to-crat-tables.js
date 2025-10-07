"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add comment fields to CratOperations table
    await queryInterface.addColumn("CratOperations", "customerComment", {
      type: Sequelize.TEXT("long"),
      allowNull: true,
      comment: "Comment from customer",
    });

    await queryInterface.addColumn("CratOperations", "adminComment", {
      type: Sequelize.TEXT("long"),
      allowNull: true,
      comment: "Comment from admin",
    });

    await queryInterface.addColumn("CratOperations", "reviewerComment", {
      type: Sequelize.TEXT("long"),
      allowNull: true,
      comment: "Comment from reviewer",
    });

    // Add comment fields to CratMarkets table
    await queryInterface.addColumn("CratMarkets", "customerComment", {
      type: Sequelize.TEXT("long"),
      allowNull: true,
      comment: "Comment from customer",
    });

    await queryInterface.addColumn("CratMarkets", "adminComment", {
      type: Sequelize.TEXT("long"),
      allowNull: true,
      comment: "Comment from admin",
    });

    await queryInterface.addColumn("CratMarkets", "reviewerComment", {
      type: Sequelize.TEXT("long"),
      allowNull: true,
      comment: "Comment from reviewer",
    });

    // Add comment fields to CratLegals table
    await queryInterface.addColumn("CratLegals", "customerComment", {
      type: Sequelize.TEXT("long"),
      allowNull: true,
      comment: "Comment from customer",
    });

    await queryInterface.addColumn("CratLegals", "adminComment", {
      type: Sequelize.TEXT("long"),
      allowNull: true,
      comment: "Comment from admin",
    });

    await queryInterface.addColumn("CratLegals", "reviewerComment", {
      type: Sequelize.TEXT("long"),
      allowNull: true,
      comment: "Comment from reviewer",
    });

    // Add comment fields to CratFinancials table
    await queryInterface.addColumn("CratFinancials", "customerComment", {
      type: Sequelize.TEXT("long"),
      allowNull: true,
      comment: "Comment from customer",
    });

    await queryInterface.addColumn("CratFinancials", "adminComment", {
      type: Sequelize.TEXT("long"),
      allowNull: true,
      comment: "Comment from admin",
    });

    await queryInterface.addColumn("CratFinancials", "reviewerComment", {
      type: Sequelize.TEXT("long"),
      allowNull: true,
      comment: "Comment from reviewer",
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove comment fields from CratOperations table
    await queryInterface.removeColumn("CratOperations", "customerComment");
    await queryInterface.removeColumn("CratOperations", "adminComment");
    await queryInterface.removeColumn("CratOperations", "reviewerComment");

    // Remove comment fields from CratMarkets table
    await queryInterface.removeColumn("CratMarkets", "customerComment");
    await queryInterface.removeColumn("CratMarkets", "adminComment");
    await queryInterface.removeColumn("CratMarkets", "reviewerComment");

    // Remove comment fields from CratLegals table
    await queryInterface.removeColumn("CratLegals", "customerComment");
    await queryInterface.removeColumn("CratLegals", "adminComment");
    await queryInterface.removeColumn("CratLegals", "reviewerComment");

    // Remove comment fields from CratFinancials table
    await queryInterface.removeColumn("CratFinancials", "customerComment");
    await queryInterface.removeColumn("CratFinancials", "adminComment");
    await queryInterface.removeColumn("CratFinancials", "reviewerComment");
  },
};
