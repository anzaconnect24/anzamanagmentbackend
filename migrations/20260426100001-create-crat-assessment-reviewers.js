"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("crat_assessment_reviewers", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      assessment_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "crat_assessments", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      reviewer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      assigned_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
        ),
      },
    });

    await queryInterface.addIndex(
      "crat_assessment_reviewers",
      ["assessment_id", "reviewer_id"],
      { unique: true, name: "crat_assessment_reviewers_unique" },
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("crat_assessment_reviewers");
  },
};
