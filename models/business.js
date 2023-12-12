'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Business extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Business.init({
    uuid:{
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    userId:{
      type:DataTypes.INTEGER,
      allowNull:false
     },
    reviewerId:{
      type:DataTypes.INTEGER,
      allowNull:false
    },
    businessSectorId:{
      type: DataTypes.INTEGER, 
      allowNull:false  
    },
     stage: {
       type: DataTypes.STRING,
       allowNull:false
     },
     problem: {
       type: DataTypes.STRING,
       allowNull:false
     },
     solution: {
       type: DataTypes.STRING,
       allowNull:false
     },
    registration:{
      type: DataTypes.STRING, 
      allowNull:true
    },
    team:{
      type: DataTypes.STRING, 
      allowNull:true
    },
    traction:{
      type: DataTypes.STRING, 
      allowNull:true 
    },
    status:{
      type: DataTypes.ENUM('waiting','rejected','accepted'), 
      defaultValue:"waiting"
    },
  }, {
    sequelize,
    modelName: 'Business',
  });
  return Business;
};