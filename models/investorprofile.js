'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class InvestorProfile extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      InvestorProfile.belongsTo(models.User)
    }
  }
  InvestorProfile.init({
      uuid:{
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull:false
      },
      investor: {
        type: DataTypes.STRING,
        allowNull:false
      },
      name: {
        type: DataTypes.STRING,
        allowNull:false
      },
      sector: {
        type: DataTypes.STRING,
        allowNull:false
      },
      geography: {
        type: DataTypes.STRING,
        allowNull:false
      },
      average: {
        type: DataTypes.STRING,
        allowNull:false
      },
      structure: {
        type: DataTypes.ENUM('equity', 'debt','mezzanine'),
        allowNull:false
      },
  }, {
    sequelize,
    modelName: 'InvestorProfile',
  });
  return InvestorProfile;
};