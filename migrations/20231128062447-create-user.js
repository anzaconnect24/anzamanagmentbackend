'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('Users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      email: {
        type: DataTypes.STRING, 
        allowNull:false 
      },
      phone:{
        type: DataTypes.STRING, 
        allowNull:false 
      },
      name: {
        type: DataTypes.STRING, 
        allowNull:false 
      },
      image: {
        type: DataTypes.STRING, 
        allowNull:true
      },
      role: {
        type: DataTypes.STRING, 
        allowNull:false  
      },
      password: {
        type: DataTypes.STRING, 
        allowNull:false  
      },
      emailConfirmed:{
        type: DataTypes.BOOLEAN,
        defaultValue:false
      },
      activated:{
        type: DataTypes.BOOLEAN,
        defaultValue:false
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE
      }
    });
  },
  async down(queryInterface, DataTypes) {
    await queryInterface.dropTable('Users');
  }
};