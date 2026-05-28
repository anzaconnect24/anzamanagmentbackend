"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class TrackerEnterprise extends Model {
    static associate(models) {
      TrackerEnterprise.belongsTo(models.User, {
        as: "Mentor",
        foreignKey: "mentorId",
      });
      TrackerEnterprise.belongsTo(models.User, {
        as: "Entreprenuer",
        foreignKey: "entreprenuerId",
      });
      TrackerEnterprise.belongsTo(models.Business, {
        foreignKey: "businessId",
      });
      TrackerEnterprise.hasMany(models.TrackerSession, {
        foreignKey: "enterpriseId",
        onDelete: "CASCADE",
      });
    }
  }

  TrackerEnterprise.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      mentorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      entreprenuerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      businessId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      category: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      ceSector: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      assignedBda: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      district: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      leadContact: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      grantUsd: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      awardDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      businessDescription: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      monthlyRevenue: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      employees: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      wasteDiverted: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      ceReadinessScore: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: true,
      },
      capitalMobilised: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      activeCustomers: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      flag: {
        type: DataTypes.ENUM("green", "amber", "red"),
        allowNull: false,
        defaultValue: "green",
      },
    },
    {
      sequelize,
      modelName: "TrackerEnterprise",
    },
  );

  return TrackerEnterprise;
};
