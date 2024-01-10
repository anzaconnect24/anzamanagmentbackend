'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ProgramApplicationDocument extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      ProgramApplicationDocument.belongsTo(models.ProgramRequirement)
      ProgramApplicationDocument.belongsTo(models.ProgramApplication)
    }
  }
  ProgramApplicationDocument.init({
      uuid:{
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      programApplicationId: {
        type: DataTypes.INTEGER,
        allowNull:false
      },
      programRequirementId: {
        type: DataTypes.INTEGER,
        allowNull:false
      },
      fileLink: {
        type: DataTypes.STRING,
        allowNull:false
      },
      fileName: {
        type: DataTypes.STRING,
        allowNull:false
      },
  }, {
    sequelize,
    modelName: 'ProgramApplicationDocument',
  });
  return ProgramApplicationDocument;
};