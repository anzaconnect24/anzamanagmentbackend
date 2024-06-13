'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Log extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Log.belongsTo(models.User)
    }
  }
  Log.init({
      uuid:{
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull:false
      },
      action: {
        type: DataTypes.STRING,
        allowNull:false
      },
  }, {
    sequelize,
    modelName: 'Log',
  });
  return Log;
};