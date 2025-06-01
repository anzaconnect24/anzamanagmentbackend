"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.addColumn("Businesses", "revenue", {
      type: DataTypes.DOUBLE,
      allowNull: true,
    });

    await queryInterface.addColumn("Businesses", "instagramLink", {
      type: DataTypes.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn("Businesses", "websiteLink", {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface, DataTypes) {
    await queryInterface.removeColumn("Businesses", "revenue");
    await queryInterface.removeColumn("Businesses", "instagramLink");
    await queryInterface.removeColumn("Businesses", "websiteLink");
  },
};
