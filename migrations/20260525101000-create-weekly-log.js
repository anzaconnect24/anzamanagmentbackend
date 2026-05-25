"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable("WeeklyLogs", {
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
      createdById: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      weekStart: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      hours: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: false,
        defaultValue: 0,
      },
      touchpoints: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      activities: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      focus: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      outcomes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      barriers: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      nextPlan: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      engagement: {
        type: DataTypes.ENUM("high", "medium", "low"),
        allowNull: true,
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

    await queryInterface.addIndex("WeeklyLogs", ["mentorId"]);
    await queryInterface.addIndex("WeeklyLogs", ["entreprenuerId"]);
    await queryInterface.addIndex("WeeklyLogs", ["businessId"]);
    await queryInterface.addIndex("WeeklyLogs", ["weekStart"]);
    await queryInterface.addIndex("WeeklyLogs", ["flag"]);
    await queryInterface.addConstraint("WeeklyLogs", {
      type: "unique",
      fields: ["mentorId", "entreprenuerId", "weekStart"],
      name: "weekly_logs_unique_mentor_entrepreneur_week",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("WeeklyLogs");
  },
};
