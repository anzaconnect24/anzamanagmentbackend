"use strict";

// CRAT is scored by AI rather than by a staff reviewer.
//
// The entrepreneur submits, the platform scores every answer against the
// question's own guidance, and an Admin then decides whether to publish. The
// reviewer tables and columns are left in place: assessments already part-way
// through the old flow must still be completable, and their history has to
// stay readable.
module.exports = {
  async up(queryInterface, Sequelize) {
    // --- the assessment carries the AI's verdict ------------------------
    await queryInterface.addColumn("crat_assessments", "ai_analysis", {
      type: Sequelize.TEXT("long"),
      allowNull: true,
    });

    await queryInterface.addColumn("crat_assessments", "ai_scored_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Why scoring failed, so an Admin can see it and re-run rather than
    // being left with an assessment stuck in limbo.
    await queryInterface.addColumn("crat_assessments", "ai_error", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    // Which model produced the scores, so a change of model is visible in
    // the record rather than silently changing what a score means.
    await queryInterface.addColumn("crat_assessments", "ai_model", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.sequelize.query(
      `ALTER TABLE crat_assessments MODIFY status
       ENUM('draft','submitted','ai_scoring','ai_scored','ai_failed','assigned','in_review','review_submitted','admin_approved','admin_rejected','published')
       NOT NULL DEFAULT 'draft'`,
    );

    // --- each answer keeps both the self-score and the AI's score -------
    //
    // The old flow overwrote score with the reviewer's, losing what the
    // entrepreneur said. Keeping them apart means the AI's judgement can be
    // compared against the self-assessment.
    await queryInterface.addColumn("crat_answers", "self_score", {
      type: Sequelize.DECIMAL(4, 2),
      allowNull: true,
    });

    await queryInterface.addColumn("crat_answers", "ai_score", {
      type: Sequelize.DECIMAL(4, 2),
      allowNull: true,
    });

    await queryInterface.addColumn("crat_answers", "ai_comment", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn("crat_answers", "ai_scored_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Existing answers: whatever score they carry today is the one that was
    // being used, so record it as the self-score too rather than leaving the
    // new column empty and making old rows look unanswered.
    await queryInterface.sequelize.query(
      "UPDATE crat_answers SET self_score = score WHERE self_score IS NULL",
    );
  },

  async down(queryInterface) {
    for (const column of [
      "self_score",
      "ai_score",
      "ai_comment",
      "ai_scored_at",
    ]) {
      await queryInterface.removeColumn("crat_answers", column);
    }

    await queryInterface.sequelize.query(
      `ALTER TABLE crat_assessments MODIFY status
       ENUM('draft','submitted','assigned','in_review','review_submitted','admin_approved','admin_rejected','published')
       NOT NULL DEFAULT 'draft'`,
    );

    for (const column of [
      "ai_analysis",
      "ai_scored_at",
      "ai_error",
      "ai_model",
    ]) {
      await queryInterface.removeColumn("crat_assessments", column);
    }
  },
};
