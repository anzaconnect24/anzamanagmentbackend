'use strict';
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('NotificationViewers', {
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
      notificationId:{
        type: DataTypes.INTEGER,
        allowNull:true
      },
      userId:{
        type: DataTypes.INTEGER,
        allowNull:true
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
    await queryInterface.dropTable('NotificationViewers');
  }
};