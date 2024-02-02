'use strict';
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('InvestmentInterests', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      from: {
        type: DataTypes.STRING,
        allowNull:false
      },
      uuid:{
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      businessId: {
        type: DataTypes.INTEGER,
        allowNull:false
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull:false
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE
      }
    });
  },
  async down(queryInterface, DataTypes) {
    await queryInterface.dropTable('InvestmentInterests');
  }
};