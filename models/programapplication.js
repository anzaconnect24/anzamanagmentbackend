'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ProgramApplication extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      ProgramApplication.hasMany(models.ProgramApplicationReview, { onDelete: 'cascade'})
      ProgramApplication.hasMany(models.ProgramApplicationDocument, { onDelete: 'cascade'})
      ProgramApplication.belongsTo(models.User)
      ProgramApplication.belongsTo(models.Program)
    }
  }
  ProgramApplication.init({
      uuid:{
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull:false
      },
      programId: {
        type: DataTypes.INTEGER,
        allowNull:false
      },
      feedback: {
        type: DataTypes.TEXT,
        allowNull:true
      },
      status: {
        type: DataTypes.ENUM('waiting', 'rejected','accepted'),
        defaultValue: 'waiting',
        allowNull:false
      },
  }, {
    sequelize,
    modelName: 'ProgramApplication',
  });
  return ProgramApplication;
};