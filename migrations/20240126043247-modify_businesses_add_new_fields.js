'use strict';

module.exports = {
  async up (queryInterface, DataTypes) {
        await queryInterface.addColumn("Businesses","investmentCurrency",{
        type: DataTypes.STRING,
        allowNull:true
        }),
        await queryInterface.addColumn("Businesses","isAlumni",{
        type: DataTypes.BOOLEAN,
        defaultValue:false
        }),
        await queryInterface.addColumn("Businesses","companyProfile",{
          type: DataTypes.STRING,
          allowNull:true
          }),
        await queryInterface.addColumn("Businesses","facebook",{
          type: DataTypes.STRING,
          allowNull:true
          }),
        await queryInterface.addColumn("Businesses","twitter",{
          type: DataTypes.STRING,
          allowNull:true
          }),
        await queryInterface.addColumn("Businesses","instagram",{
          type: DataTypes.STRING,
          allowNull:true
          }),
        await queryInterface.addColumn("Businesses","linkedin",{
          type: DataTypes.STRING,
          allowNull:true
          }),
        await queryInterface.addColumn("Businesses","completedProgram",{
        type: DataTypes.STRING,
        allowNull:true
        })
        await queryInterface.addColumn("Businesses","businessPlan",{
          type: DataTypes.STRING,
          allowNull:true
        })
        await queryInterface.addColumn("Businesses","marketResearch",{
          type: DataTypes.STRING,
          allowNull:true
        })
  },
  
 

  async down (queryInterface, DataTypes) {
    await queryInterface.removeColumn("Businesses","investmentCurrency")
    await queryInterface.removeColumn("Businesses","isAlumni")
    await queryInterface.removeColumn("Businesses","completedProgram")
    await queryInterface.removeColumn("Businesses","businessPlan")
    await queryInterface.removeColumn("Businesses","marketResearch")

  }
};
