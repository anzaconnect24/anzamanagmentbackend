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
      // define association here
      User.hasMany(models.UserRole, { onDelete: "CASCADE", scope: true });
      User.hasMany(models.UserPermission, { onDelete: "CASCADE", scope: true });
      User.hasOne(models.Business, { onDelete: "CASCADE", scope: true });
      User.hasOne(models.BusinessReview, { onDelete: "CASCADE", scope: true });
      User.hasMany(models.ProgramApplication, {
        onDelete: "CASCADE",
        scope: true,
      });
      User.hasOne(models.InvestorProfile, { onDelete: "CASCADE", scope: true });
      User.hasOne(models.ProgramApplicationReview);
      User.hasMany(models.BusinessInvestmentRequest, {
        onDelete: "CASCADE",
        scope: true,
      });
      User.hasOne(models.BusinessInvestmentRequestReview, {
        onDelete: "CASCADE",
        scope: true,
      });
      User.hasOne(models.Log, { onDelete: "CASCADE", scope: true });
      User.hasMany(models.MentorEntreprenuer, {
        onDelete: "CASCADE",
        scope: true,
      });
      User.hasMany(models.InvestmentInterest, {
        onDelete: "CASCADE",
        scope: true,
      });
      User.hasMany(models.PitchMaterialViewer, {
        onDelete: "CASCADE",
        scope: true,
      });
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
    },
    {
      sequelize,
      modelName: "User",
    }
  );
  return User;
};
