"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      User.hasMany(models.UserRole, { onDelete: "cascade" });
      User.hasMany(models.UserPermission, { onDelete: "cascade" });
      User.hasOne(models.Business, { onDelete: "cascade" });
      User.hasOne(models.BusinessReview, { onDelete: "cascade" });
      User.hasMany(models.ProgramApplication, { onDelete: "cascade" });
      User.hasOne(models.InvestorProfile, { onDelete: "cascade" });
      User.hasOne(models.ProgramApplicationReview);
      User.hasMany(models.BusinessInvestmentRequest, { onDelete: "cascade" });
      User.hasOne(models.BusinessInvestmentRequestReview, {
        onDelete: "cascade",
      });
      User.hasOne(models.Log, { onDelete: "cascade" });
      User.hasMany(models.MentorEntreprenuer, { onDelete: "cascade" });
      User.hasMany(models.InvestmentInterest, { onDelete: "cascade" });
      User.hasMany(models.PitchMaterialViewer, { onDelete: "cascade" });

      User.hasMany(models.CratFinancials, { foreignKey: 'userId' });
      User.hasMany(models.CratMarkets, { foreignKey: 'userId' });
      User.hasMany(models.CratOperations, { foreignKey: 'userId' });
      User.hasMany(models.CratLegals, { foreignKey: 'userId' });
  
    }
  }
  User.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      activated: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      emailConfirmed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      image: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      versionCount: {  
        type: DataTypes.INTEGER,
        defaultValue: 1, 
      },
      publishStatus: {  
        type: DataTypes.STRING,
        defaultValue: "Draft", 
      },
      reportPdf: {
        type: DataTypes.STRING,
        allowNull:false  
      },
    },
    {
      sequelize,
      modelName: "User",
    }
  );
  return User;
};
