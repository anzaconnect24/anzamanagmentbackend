'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class BusinessInvestmentRequestReview extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      BusinessInvestmentRequestReview.belongsTo(models.BusinessInvestmentRequest)
      BusinessInvestmentRequestReview.belongsTo(models.User)
    }
  }
  BusinessInvestmentRequestReview.init({
      uuid:{
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull:false
      },
      businessInvestmentRequestId: {
        type: DataTypes.INTEGER,
        allowNull:false
      },
      status: {
        type: DataTypes.ENUM('waiting', 'rejected','accepted'),
        defaultValue: 'waiting',
        allowNull:false
      },
      feedback: {
        type: DataTypes.STRING,
        allowNull:true
      },
  }, {
    sequelize,
    modelName: 'BusinessInvestmentRequestReview',
  });
  return BusinessInvestmentRequestReview;
};