"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.addColumn("TrackerEnterprises", "signedContractUrl", {
      type: DataTypes.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn(
      "TrackerEnterprises",
      "signedContractUploadedAt",
      {
        type: DataTypes.DATE,
        allowNull: true,
      },
    );

    await queryInterface.addColumn(
      "TrackerEnterprises",
      "startupSignedContractUrl",
      {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    );

    await queryInterface.addColumn(
      "TrackerEnterprises",
      "contractAcknowledgedAt",
      {
        type: DataTypes.DATE,
        allowNull: true,
      },
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      "TrackerEnterprises",
      "contractAcknowledgedAt",
    );
    await queryInterface.removeColumn(
      "TrackerEnterprises",
      "startupSignedContractUrl",
    );
    await queryInterface.removeColumn(
      "TrackerEnterprises",
      "signedContractUploadedAt",
    );
    await queryInterface.removeColumn(
      "TrackerEnterprises",
      "signedContractUrl",
    );
  },
};
