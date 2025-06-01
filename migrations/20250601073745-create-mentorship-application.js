"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable("MentorshipApplications", {
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
      challenges: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      mentorshipAreas: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      mentorshipMode: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      availability: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: "PENDING",
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
  },
  async down(queryInterface, DataTypes) {
    await queryInterface.dropTable("MentorshipApplications");
  },
};
