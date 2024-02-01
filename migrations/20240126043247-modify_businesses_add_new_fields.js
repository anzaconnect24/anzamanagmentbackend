'use strict';

module.exports = {
  async up (queryInterface, DataTypes) {
    await queryInterface.addColumn("Businesses","investmentCurrency",{
        type: DataTypes.STRING,
        allowNull:true
    })
  },

  async down (queryInterface, DataTypes) {
    await queryInterface.removeColumn("Businesses","investmentCurrency")
  }
};
