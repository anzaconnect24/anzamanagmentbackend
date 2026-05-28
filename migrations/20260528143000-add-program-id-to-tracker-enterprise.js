"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.addColumn("TrackerEnterprises", "programId", {
      type: DataTypes.INTEGER,
      allowNull: true,
    });

    await queryInterface.addIndex("TrackerEnterprises", ["programId"]);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("TrackerEnterprises", ["programId"]);
    await queryInterface.removeColumn("TrackerEnterprises", "programId");
  },
};
