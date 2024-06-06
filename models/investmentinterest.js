'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class InvestmentInterest extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      InvestmentInterest.belongsTo(models.Business)
      InvestmentInterest.belongsTo(models.User)
    }
  }
  InvestmentInterest.init({
    uuid:{
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    from: {
      type: DataTypes.STRING,
      allowNull:false
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
    modelName: 'InvestmentInterest',
  });
  return InvestmentInterest;
};