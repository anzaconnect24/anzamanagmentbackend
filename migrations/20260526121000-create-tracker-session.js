"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable("TrackerSessions", {
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
      enterpriseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
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
      sessionDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      facilitator: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      sessionType: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      issuesDiscussed: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      recommendationsGiven: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      actionsAgreed: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      nextSessionDate: {
        type: DataTypes.DATEONLY,
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

    await queryInterface.addIndex("TrackerSessions", ["enterpriseId"]);
    await queryInterface.addIndex("TrackerSessions", ["mentorId"]);
    await queryInterface.addIndex("TrackerSessions", ["entreprenuerId"]);
    await queryInterface.addIndex("TrackerSessions", ["sessionDate"]);
    await queryInterface.addIndex("TrackerSessions", ["flag"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("TrackerSessions");
  },
};
