'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class NotificationViewer extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      NotificationViewer.belongsTo(models.Notification)
    }
  }
  NotificationViewer.init({
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
  }, {
    sequelize,
    modelName: 'NotificationViewer',
  });
  return NotificationViewer;
};