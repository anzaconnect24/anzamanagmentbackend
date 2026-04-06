"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("crat_question_catalog", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      domain: {
        type: Sequelize.ENUM(
          "commercial_marketing",
          "financial",
          "legal_compliance",
          "operations",
        ),
        allowNull: false,
      },
      variant: {
        type: Sequelize.ENUM("default", "fintech"),
        allowNull: false,
        defaultValue: "default",
      },
      question_code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      question_text_en: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      question_text_sw: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      guidance_en: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      guidance_sw: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    await queryInterface.createTable("crat_assessments", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      business_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      entrepreneur_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM(
          "draft",
          "submitted",
          "assigned",
          "in_review",
          "review_submitted",
          "admin_approved",
          "admin_rejected",
          "published",
        ),
        allowNull: false,
        defaultValue: "draft",
      },
      assigned_reviewer_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      submitted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      reviewer_submitted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      admin_decided_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      admin_decision_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      published_at: {
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

    await queryInterface.addIndex("crat_assessments", [
      "status",
      "assigned_reviewer_id",
    ]);

    await queryInterface.createTable("crat_answers", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      assessment_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      business_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      question_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      domain: {
        type: Sequelize.ENUM(
          "commercial_marketing",
          "financial",
          "legal_compliance",
          "operations",
        ),
        allowNull: false,
      },
      score: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      evidence: {
        type: Sequelize.TEXT("long"),
        allowNull: true,
      },
      entrepreneur_comment: {
        type: Sequelize.TEXT("long"),
        allowNull: true,
      },
      reviewer_comment: {
        type: Sequelize.TEXT("long"),
        allowNull: true,
      },
      reviewed_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      reviewed_at: {
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

    await queryInterface.addConstraint("crat_answers", {
      type: "unique",
      fields: ["assessment_id", "question_id"],
      name: "uniq_crat_answers_assessment_question",
    });
    await queryInterface.addIndex("crat_answers", ["business_id", "domain"]);
    await queryInterface.addIndex("crat_answers", ["assessment_id", "domain"]);

    await queryInterface.createTable("crat_score_snapshots", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      assessment_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      domain_scores_json: {
        type: Sequelize.TEXT("long"),
        allowNull: false,
      },
      overall_score_5: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: false,
      },
      overall_percent: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: false,
      },
      incomplete: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },
      generated_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      generated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("crat_score_snapshots");
    await queryInterface.dropTable("crat_answers");
    await queryInterface.dropTable("crat_assessments");
    await queryInterface.dropTable("crat_question_catalog");
  },
};
