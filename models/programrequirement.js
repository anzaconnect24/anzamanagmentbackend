'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ProgramRequirement extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      ProgramRequirement.belongsTo(models.Program)
      // ProgramRequirement.hasOne(models.ProgramApplicationDocument)
    }
  }
  ProgramRequirement.init({
      uuid:{
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      name: {
        type: DataTypes.STRING,
        allowNull:false
      },
      programId: {
        type: DataTypes.STRING,
        allowNull:false
      },
  }, {
    sequelize,
    modelName: 'ProgramRequirement',
  });
  return ProgramRequirement;
};