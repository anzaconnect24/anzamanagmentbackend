'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('BusinessReviews', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      uuid:{
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      userId:{
        type:DataTypes.INTEGER,
        allowNull:false
      },
      businessId:{
        type:DataTypes.INTEGER,
        allowNull:false
      },
      isReviewed:{
        type: DataTypes.BOOLEAN, 
        defaultValue:false
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
    await queryInterface.dropTable('BusinessReviews');
  }
};