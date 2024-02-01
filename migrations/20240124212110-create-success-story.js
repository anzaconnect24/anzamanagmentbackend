'use strict';
/** @type {import('DataTypes-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('SuccessStories', {
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
      title: {
        type: DataTypes.STRING,
        allowNull:false
      },
      businessId: {
        type: DataTypes.INTEGER,
        allowNull:false
      },
      story: {
        type: DataTypes.TEXT,
        allowNull:false
      },
      videoLink: {
        type: DataTypes.TEXT,
        allowNull:true
      },
      documentLink: {
        type: DataTypes.TEXT,
        allowNull:true
      },
      likes: {
        type: DataTypes.INTEGER,
        defaultValue:0
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
    await queryInterface.dropTable('SuccessStories');
  }
};