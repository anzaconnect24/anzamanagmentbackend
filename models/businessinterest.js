'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class BusinessInterest extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      BusinessInterest.belongsTo(models.User)
      BusinessInterest.belongsTo(models.Business)
    }
  }
  BusinessInterest.init({
      uuid:{
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      businessId: {
        type: DataTypes.INTEGER,
        allowNull:false
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull:false
      },
  }, {
    sequelize,
    modelName: 'BusinessInterest',
  });
  return BusinessInterest;
};