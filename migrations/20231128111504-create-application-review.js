'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('ApplicationReviews', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      userId:{
       type:DataTypes.INTEGER,
       allowNull:false
      },
      applicationId:{
       type:DataTypes.INTEGER,
       allowNull:false
      },
      status:{
       type:DataTypes.ENUM('pending', 'rejected','approved'),
       defaultValue:"pending"
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
    await queryInterface.dropTable('ApplicationReviews');
  }
};