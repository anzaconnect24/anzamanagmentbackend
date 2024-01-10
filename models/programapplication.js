'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ProgramApplication extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  ProgramApplication.init({
      uuid:{
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      userId: {
        type: DataTypes.STRING,
        allowNull:false
      },
      programId: {
        type: DataTypes.STRING,
        allowNull:false
      },
      status: {
        type: DataTypes.ENUM('waiting', 'rejected','accepted'),
        allowNull:false
      },
  }, {
    sequelize,
    modelName: 'ProgramApplication',
  });
  return ProgramApplication;
};