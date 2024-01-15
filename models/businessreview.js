'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class BusinessReview extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      BusinessReview.belongsTo(models.Business)
      // BusinessReview.hasOne(models.User);
    }
  }
  BusinessReview.init({
      uuid:{
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      userId:{
        type:DataTypes.INTEGER,
        allowNull:false
      },
      businessId:{
        type:DataTypes.INTEGER,
        allowNull:false
      },
      isReviewed:{
        type: DataTypes.BOOLEAN, 
        defaultValue:false
      },
  }, {
    sequelize,
    modelName: 'BusinessReview',
  });
  return BusinessReview;
};