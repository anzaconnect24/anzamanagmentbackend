'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CratFinancials extends Model {
    static associate(models) {
      CratFinancials.hasMany(models.Attachment, { onDelete: 'cascade'})
    }
  }
  CratFinancials.init({
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    userId:{
     type:DataTypes.INTEGER,
     allowNull:false
    },

    subDomain: {
      type: DataTypes.STRING,
      allowNull:false  
    },
    score: {
      type: DataTypes.INTEGER,
      allowNull:false  
    },
    attachment: {
        type: DataTypes.STRING,
        allowNull:true  
      },
      comments: {
        type: DataTypes.TEXT,
        allowNull:true  
      },
    rating : {
        type: DataTypes.ENUM('Yes','No','Maybe'),
        allowNull:false  
      },
    reviewed : {
      type: DataTypes.TEXT,
      allowNull:true  
    },
    reviewer : {
      type: DataTypes.TEXT,
      allowNull:true  
    },
    reviewCount : {
      type: DataTypes.INTEGER,
      allowNull:true  
    },
  }, {
    sequelize,
    modelName: 'CratFinancials',
    timestamps: true, 
    createdAt: 'createdAt',
    updatedAt: 'updatedAt', 

  });
  return CratFinancials;
};