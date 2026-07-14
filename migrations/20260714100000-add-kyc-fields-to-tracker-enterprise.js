"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = "TrackerEnterprises";
    const table = await queryInterface.describeTable(tableName);

    const columns = {
      firstName: { type: Sequelize.STRING, allowNull: true },
      lastName: { type: Sequelize.STRING, allowNull: true },
      representativeEmail: { type: Sequelize.STRING, allowNull: true },
      representativePhone: { type: Sequelize.STRING, allowNull: true },
      gender: { type: Sequelize.STRING, allowNull: true },
      nationalId: { type: Sequelize.STRING, allowNull: true },
      tin: { type: Sequelize.STRING, allowNull: true },
      registeredBusinessName: { type: Sequelize.STRING, allowNull: true },
      displayName: { type: Sequelize.STRING, allowNull: true },
      businessPhone: { type: Sequelize.STRING, allowNull: true },
      country: { type: Sequelize.STRING, allowNull: true },
      latitude: { type: Sequelize.STRING, allowNull: true },
      longitude: { type: Sequelize.STRING, allowNull: true },
      documents: { type: Sequelize.TEXT, allowNull: true },
    };

    for (const [columnName, definition] of Object.entries(columns)) {
      if (!table[columnName]) {
        await queryInterface.addColumn(tableName, columnName, definition);
      }
    }
  },

  async down(queryInterface) {
    const tableName = "TrackerEnterprises";
    const table = await queryInterface.describeTable(tableName);

    const columns = [
      "firstName",
      "lastName",
      "representativeEmail",
      "representativePhone",
      "gender",
      "nationalId",
      "tin",
      "registeredBusinessName",
      "displayName",
      "businessPhone",
      "country",
      "latitude",
      "longitude",
      "documents",
    ];

    for (const columnName of columns) {
      if (table[columnName]) {
        await queryInterface.removeColumn(tableName, columnName);
      }
    }
  },
};
