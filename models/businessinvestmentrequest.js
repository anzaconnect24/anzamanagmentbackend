'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class BusinessInvestmentRequest extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      BusinessInvestmentRequest.hasMany(models.BusinessInvestmentRequestReview)
      BusinessInvestmentRequest.belongsTo(models.User)
      BusinessInvestmentRequest.belongsTo(models.Business)
    }
  }
  BusinessInvestmentRequest.init({
      uuid:{
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      userId: {
        type: DataTypes.STRING,
        allowNull:false
      },
      businessId: {
        type: DataTypes.STRING,
        allowNull:false
      },
      status: {
        type: DataTypes.ENUM('waiting','accepted','rejected'),
        defaultValue:"waiting",
        allowNull:false
      },
  }, {
    sequelize,
    modelName: 'BusinessInvestmentRequest',
  });
  return BusinessInvestmentRequest;
};