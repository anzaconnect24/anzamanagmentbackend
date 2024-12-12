'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'versionCount', {
      type: Sequelize.INTEGER,
      defaultValue: 1, 
    });
    await queryInterface.addColumn('Users', 'publishStatus', {
      type: Sequelize.STRING,
      defaultValue: 'Draft',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'versionCount');
    await queryInterface.removeColumn('Users', 'publishStatus');
  }
};
