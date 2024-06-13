'use strict';
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('Notifications', {
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
      to: {
        type: DataTypes.STRING,
        allowNull:true
      },
      userId:{
        type: DataTypes.INTEGER,
        allowNull:true
      },
      message:{
        type:DataTypes.STRING,
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
    await queryInterface.dropTable('Notifications');
  }
};