'use strict';
/** @type {import('DataTypes-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('ProgramApplicationReviews', {
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
      programApplicationId: {
        type: DataTypes.INTEGER,
        allowNull:false
      },
      status: {
        type: DataTypes.ENUM('waiting', 'rejected','accepted'),
        allowNull:false
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull:false
      },
      feedback: {
        type: DataTypes.STRING,
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
    await queryInterface.dropTable('ProgramApplicationReviews');
  }
};
