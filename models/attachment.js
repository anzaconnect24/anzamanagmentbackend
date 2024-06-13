'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Attachment extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Attachment.belongsTo(models.Application)
    }
  }
  Attachment.init({
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    image: {
      type: DataTypes.STRING,
      allowNull:false
    },
    applicationId:{
      type:DataTypes.INTEGER,
      allowNull:false
    },
  }, {
    sequelize,
    modelName: 'Attachment',
  });
  return Attachment;
};