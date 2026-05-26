"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable("TrackerEnterprises", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
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
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
    });

    await queryInterface.addIndex("TrackerEnterprises", ["mentorId"]);
    await queryInterface.addIndex("TrackerEnterprises", ["entreprenuerId"]);
    await queryInterface.addIndex("TrackerEnterprises", ["businessId"]);
    await queryInterface.addConstraint("TrackerEnterprises", {
      type: "unique",
      fields: ["mentorId", "entreprenuerId"],
      name: "tracker_enterprise_unique_mentor_entrepreneur",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("TrackerEnterprises");
  },
};
