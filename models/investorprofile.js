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
      company: {
        type: DataTypes.STRING,
        allowNull:true
      },
      role:{
        type: DataTypes.STRING,
        allowNull:false
      },
      sectorId: {
        type: DataTypes.INTEGER,
        allowNull:false
      },
      geography: {
        type: DataTypes.STRING,
        allowNull:false
      },
      ticketSize: {
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