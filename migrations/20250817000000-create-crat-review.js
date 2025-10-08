"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("crat_reviews", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      uuid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        unique: true,
      },
      entrepreneur_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true, // One-to-one relationship
      },
      reviewer_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      comments: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM(
          "pending",
          "assigned",
          "in_review",
          "reviewed",
          "accepted",
          "rejected"
        ),
        defaultValue: "pending",
        allowNull: false,
      },
      reviewer_comments: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      admin_comments: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      submitted_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
      },
      assigned_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      reviewed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      finalized_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("crat_reviews");
  },
};
