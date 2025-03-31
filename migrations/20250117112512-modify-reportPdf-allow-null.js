'use strict';

module.exports = {
  up: async (queryInterface, DataTypes) => {
    await queryInterface.changeColumn('Users', 'reportPdf', {
      type: DataTypes.STRING,
      allowNull: true, // Change to allow null values
    });
  },

  down: async (queryInterface, DataTypes) => {
    await queryInterface.changeColumn('Users', 'reportPdf', {
      type: DataTypes.STRING,
      allowNull: false, // Revert back to not allowing null values
    });
  },
};
