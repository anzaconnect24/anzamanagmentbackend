'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SuccessStory extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      SuccessStory.belongsTo(models.Business)
    }
  }
  SuccessStory.init({
      uuid:{
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      title: {
        type: DataTypes.STRING,
        allowNull:false
      },
      businessId: {
        type: DataTypes.INTEGER,
        allowNull:false
      },
      restriction: {
        type: DataTypes.TEXT,
        allowNull:false
      },
      videoLink: {
        type: DataTypes.TEXT,
        allowNull:false
      },
      documentLink: {
        type: DataTypes.TEXT,
        allowNull:false
      },
      likes: {
        type: DataTypes.INTEGER,
        allowNull:false
      },
  }, {
    sequelize,
    modelName: 'SuccessStory',
  });
  return SuccessStory;
};