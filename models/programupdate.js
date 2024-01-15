'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ProgramUpdate extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      ProgramUpdate.belongsTo(models.Program)
    }
  }
  ProgramUpdate.init({
      uuid:{
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      programId: {
        type: DataTypes.INTEGER,
        allowNull:false
      },
      title: {
        type: DataTypes.STRING,
        allowNull:false
      },
      description: {
        type: DataTypes.STRING,
        allowNull:false
      },
      image: {
        type: DataTypes.STRING,
        allowNull:true
      },
  }, {
    sequelize,
    modelName: 'ProgramUpdate',
  });
  return ProgramUpdate;
};