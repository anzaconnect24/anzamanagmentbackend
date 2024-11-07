"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Business extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Business.belongsTo(models.User);
      Business.belongsTo(models.BusinessSector);
      Business.hasMany(models.BusinessDocument);
      Business.hasMany(models.BusinessInvestmentRequest, {
        onDelete: "cascade",
      });
      Business.hasMany(models.InvestmentInterest, { onDelete: "cascade" });
      Business.hasMany(models.SuccessStory, { onDelete: "cascade" });
    }
  }
  Business.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      reviewerId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      lookingForInvestment: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      isAlumni: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      companyProfile: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      facebook: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      instagram: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      linkedin: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      sdg: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      twitter: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      completedProgram: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      investmentAmount: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      investmentCurrency: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      businessPlan: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      marketResearch: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      businessSectorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      stage: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      problem: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      solution: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      registration: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      team: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      traction: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("waiting", "rejected", "accepted"),
        defaultValue: "waiting",
      },
    },
    {
      sequelize,
      modelName: "Business",
    }
  );
  return Business;
};
