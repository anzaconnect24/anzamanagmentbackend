"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable("MentorProfiles", {
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
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      linkedinURL: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      organisation: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      position: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      areasOfExperties: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      mentorAvailability: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      mentorHours: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      mentoringFormat: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      businessSectorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      location: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      language: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      mentorshipFocus: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      smeFocus: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
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
    await queryInterface.dropTable("MentorProfiles");
  },
};
