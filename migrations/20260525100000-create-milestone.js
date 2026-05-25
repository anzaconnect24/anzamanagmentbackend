"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable("Milestones", {
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
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      dueDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(
          "pending",
          "in_progress",
          "submitted",
          "completed",
          "overdue",
          "rejected",
        ),
        allowNull: false,
        defaultValue: "pending",
      },
      submissionNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      submissionDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      mentorReviewNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      reviewedById: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      reviewedAt: {
        type: DataTypes.DATE,
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

    await queryInterface.addIndex("Milestones", ["mentorId"]);
    await queryInterface.addIndex("Milestones", ["entreprenuerId"]);
    await queryInterface.addIndex("Milestones", ["businessId"]);
    await queryInterface.addIndex("Milestones", ["status"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Milestones");
  },
};
