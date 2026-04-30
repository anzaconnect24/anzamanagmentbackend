"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("crat_question_catalog", "domain", {
      type: Sequelize.STRING(64),
      allowNull: false,
    });

    await queryInterface.changeColumn("crat_question_catalog", "variant", {
      type: Sequelize.STRING(64),
      allowNull: false,
      defaultValue: "default",
    });

    await queryInterface.changeColumn("crat_answers", "domain", {
      type: Sequelize.STRING(64),
      allowNull: false,
    });

    await queryInterface.changeColumn("crat_answers", "score", {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn(
      "crat_assessment_reviewers",
      "submitted_at",
      {
        type: Sequelize.DATE,
        allowNull: true,
      },
    );

    await queryInterface.createTable("crat_reviewer_scores", {
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
      question_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "crat_question_catalog", key: "id" },
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
      score: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      reviewer_comment: {
        type: Sequelize.TEXT("long"),
        allowNull: true,
      },
      submitted_at: {
        type: Sequelize.DATE,
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
      "crat_reviewer_scores",
      ["assessment_id", "question_id", "reviewer_id"],
      {
        unique: true,
        name: "crat_reviewer_scores_unique",
      },
    );

    await queryInterface.addIndex("crat_reviewer_scores", ["assessment_id"], {
      name: "crat_reviewer_scores_assessment_idx",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      "crat_reviewer_scores",
      "crat_reviewer_scores_assessment_idx",
    );
    await queryInterface.removeIndex(
      "crat_reviewer_scores",
      "crat_reviewer_scores_unique",
    );
    await queryInterface.dropTable("crat_reviewer_scores");

    await queryInterface.removeColumn(
      "crat_assessment_reviewers",
      "submitted_at",
    );

    await queryInterface.changeColumn("crat_answers", "score", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.changeColumn("crat_answers", "domain", {
      type: Sequelize.ENUM(
        "commercial_marketing",
        "financial",
        "legal_compliance",
        "operations",
      ),
      allowNull: false,
    });

    await queryInterface.changeColumn("crat_question_catalog", "variant", {
      type: Sequelize.ENUM("default", "fintech"),
      allowNull: false,
      defaultValue: "default",
    });

    await queryInterface.changeColumn("crat_question_catalog", "domain", {
      type: Sequelize.ENUM(
        "commercial_marketing",
        "financial",
        "legal_compliance",
        "operations",
      ),
      allowNull: false,
    });
  },
};
