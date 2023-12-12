'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Application extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Application.hasMany(models.Attachment, { onDelete: 'cascade'})
    }
  }
  Application.init({
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    userId:{
     type:DataTypes.INTEGER,
     allowNull:false
    },

    business: {
      type: DataTypes.STRING,
      allowNull:true  
    },
    address: {
      type: DataTypes.STRING,
      allowNull:true  
    },
    name: {
      type: DataTypes.STRING,
      allowNull:true  
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull:true  
    },
    gender: {
      type: DataTypes.STRING,
      allowNull:true  
    },
    email: {
      type: DataTypes.STRING,
      allowNull:true  
    },
    phone: {
      type: DataTypes.INTEGER,
      allowNull:true  
    },
    website: {
      type: DataTypes.STRING,
      allowNull:true  
    },
    instagram: {
      type: DataTypes.STRING,
      allowNull:true  
    },
    linkedin: {
      type: DataTypes.STRING,
      allowNull:true  
    },
    stage: {
      type: DataTypes.ENUM('Pre-MVP', 'MVP','Pre-revenue','Post-revenue'),
      allowNull:true  
    },
    product: {
      type: DataTypes.ENUM('Payment/remittances', 'Lending/financing','Investments','Saving','Personal finance','Insurance','Enabling processes and technologies','Other'),
      allowNull:true  
    },
    registeredAt: {
      type: DataTypes.DATE,
      allowNull:true  
    },
    registrationNo: {
      type: DataTypes.STRING,
      allowNull:true  
    },
    legalStructure: {
      type: DataTypes.ENUM('Limited liability company', 'Limited liability partnership','Partnership','Sole proprietorship'),
      allowNull:true  
    },
    shareholders : {
      type: DataTypes.TEXT,
      allowNull:true  
    },
    womenSharehold : {
      type: DataTypes.INTEGER,
      allowNull:true  
    },
    pitch : {
      type: DataTypes.TEXT,
      allowNull:true  
    },
    solving : {
      type: DataTypes.TEXT,
      allowNull:true  
    },
    target : {
      type: DataTypes.TEXT,
      allowNull:true  
    },
    businessModel : {
      type: DataTypes.TEXT,
      allowNull:true  
    },
    sellingProposition : {
      type: DataTypes.TEXT,
      allowNull:true  
    },
    competitors : {
      type: DataTypes.TEXT,
      allowNull:true  
    },
    traction : {
      type: DataTypes.TEXT,
      allowNull:true  
    },
    revenuePast : {
      type: DataTypes.TEXT,
      allowNull:true  
    },
    revenueNext : {
      type: DataTypes.TEXT,
      allowNull:true  
    },
    raised : {
      type: DataTypes.TEXT,
      allowNull:true  
    },
    partnerships : {
      type: DataTypes.TEXT,
      allowNull:true  
    },
    countries : {
      type: DataTypes.TEXT,
      allowNull:true  
    },
    impact : {
      type: DataTypes.TEXT,
      allowNull:true  
    },
    employees : {
      type: DataTypes.TEXT,
      allowNull:true  
    },
    womenEmployees : {
      type: DataTypes.TEXT,
      allowNull:true  
    },
    seniorManagementWomen : {
      type: DataTypes.TEXT,
      allowNull:true  
    },
    strength : {
      type: DataTypes.TEXT,
      allowNull:true  
    },
    accelerator : {
      type: DataTypes.TEXT,
      allowNull:true  
    },
    nmbApi : {
      type: DataTypes.ENUM('yes','no'),
      allowNull:true  
    },
    programs : {
      type: DataTypes.TEXT,
      allowNull:true  
    },
    phase : {
      type: DataTypes.ENUM('Phase 1','Phase 2','Phase 3'),
      allowNull:true  
    },
    status : {
      type: DataTypes.ENUM('pending','assigned'),
      defaultValue:'pending'  
    },
    

  }, {
    sequelize,
    modelName: 'Application',
  });
  return Application;
};