'use strict';
/** @type {import('DataTypes-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable('BusinessInvestmentRequests', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      uuid:{
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      userId: {
        type: DataTypes.STRING,
        allowNull:false
      },
      businessId: {
        type: DataTypes.STRING,
        allowNull:false
      },
      investmentAmount:{
        type:DataTypes.INTEGER,
        defaultValue:0
      },
      investmentType: {
        type: DataTypes.STRING,
        allowNull:false
      },
      currency: {
        type: DataTypes.STRING,
        allowNull:false
      },
      dueDiligenceDate: {
        type: DataTypes.DATE,
        allowNull:false
      },
      helpFromAnza: {
        type: DataTypes.TEXT,
        allowNull:false
      },
      feedback: {
        type: DataTypes.STRING,
        allowNull:true
      },
      status: {
        type: DataTypes.ENUM('waiting','accepted','rejected','closed'),
        defaultValue:"waiting",
        allowNull:false
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
    await queryInterface.dropTable('BusinessInvestmentRequests');
  }
};