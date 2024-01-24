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
      restriction: {
        type: DataTypes.TEXT,
        allowNull:false
      },
      videoLink: {
        type: DataTypes.TEXT,
        allowNull:false
      },
      documentLink: {
        type: DataTypes.TEXT,
        allowNull:false
      },
      likes: {
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
    await queryInterface.dropTable('SuccessStories');
  }
};