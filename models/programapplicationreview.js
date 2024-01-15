'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ProgramApplicationReview extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      ProgramApplicationReview.belongsTo(models.User)
      ProgramApplicationReview.belongsTo(models.ProgramApplication)
      // define association here
    }
  }
  ProgramApplicationReview.init({
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
        defaultValue: 'waiting',
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
  }, {
    sequelize,
    modelName: 'ProgramApplicationReview',
  });
  return ProgramApplicationReview;
};