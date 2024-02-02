'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class BusinessDocument extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      BusinessDocument.belongsTo(models.Business)
    }
  }
  BusinessDocument.init({
    uuid:{
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    title: {
      type: DataTypes.STRING,
      allowNull:false
    },
    link: {
      type: DataTypes.STRING,
      allowNull:false
    },
    type:{
      type:DataTypes.STRING,
      allowNull:true
    },
    businessId: {
      type: DataTypes.STRING,
      allowNull:false
    },
  }, {
    sequelize,
    modelName: 'BusinessDocument',
  });
  return BusinessDocument;
};