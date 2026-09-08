"use strict";

// Learning, phase 1: lessons between a module and its content.
//
// The chain today is Programme -> Module -> Slide. This inserts Lesson, so it
// becomes Programme -> Module -> Lesson -> Content, and reuses the existing
// Slides table as the content items rather than starting a parallel one. That
// keeps every slide, every read record and the whole /slides API working.
//
// Nothing is dropped or renamed. Every existing module gets one lesson holding
// the slides it already had, so existing courses look and behave the same.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("lessons", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      uuid: { type: Sequelize.UUID, allowNull: false, unique: true },
      moduleId: { type: Sequelize.INTEGER, allowNull: false },
      title: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      estimatedMinutes: { type: Sequelize.INTEGER, allowNull: true },
      // Whether the lesson counts towards course completion.
      required: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      // How a learner finishes it. "content" means every content item was
      // opened; "manual" means they tick it off themselves.
      completionRule: {
        type: Sequelize.ENUM("content", "manual"),
        allowNull: false,
        defaultValue: "content",
      },
      status: {
        type: Sequelize.ENUM("draft", "published", "archived"),
        allowNull: false,
        defaultValue: "published",
      },
      createdById: { type: Sequelize.INTEGER, allowNull: true },
      archivedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.addIndex("lessons", ["moduleId"], {
      name: "lessons_module",
    });

    // --- Slides become lesson content items -----------------------------

    await queryInterface.addColumn("Slides", "lessonId", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addIndex("Slides", ["lessonId"], {
      name: "slides_lesson",
    });

    await queryInterface.addColumn("Slides", "position", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    // Widening the enum keeps "text" and "file" valid, so nothing existing
    // has to be rewritten.
    await queryInterface.sequelize.query(
      "ALTER TABLE Slides MODIFY type ENUM('text','file','video','presentation','document','link') DEFAULT 'text'",
    );

    // Video and external content need a few fields of their own.
    await queryInterface.addColumn("Slides", "url", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("Slides", "durationSeconds", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn("Slides", "thumbnail", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("Slides", "description", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    // Whether learners may take the file away, for licensed material.
    await queryInterface.addColumn("Slides", "downloadable", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    // --- Reads become progress ------------------------------------------
    //
    // A read row already means "this learner opened this item". Video needs
    // more than that: opening a page is not watching it.

    await queryInterface.addColumn("SlideReaders", "secondsWatched", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn("SlideReaders", "lastPosition", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn("SlideReaders", "percentWatched", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn("SlideReaders", "completed", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
    await queryInterface.addColumn("SlideReaders", "completedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // --- Backfill --------------------------------------------------------
    //
    // One lesson per existing module, carrying that module's slides, so no
    // content is orphaned and nothing changes for anyone using the platform.

    const [modules] = await queryInterface.sequelize.query(
      "SELECT id, title FROM Modules",
    );

    for (const module of modules) {
      const [result] = await queryInterface.sequelize.query(
        "INSERT INTO lessons (uuid, moduleId, title, position, required, completionRule, status, createdAt, updatedAt) VALUES (UUID(), :moduleId, :title, 0, true, 'content', 'published', NOW(), NOW())",
        { replacements: { moduleId: module.id, title: module.title || "Lesson 1" } },
      );

      await queryInterface.sequelize.query(
        "UPDATE Slides SET lessonId = :lessonId WHERE moduleId = :moduleId AND lessonId IS NULL",
        { replacements: { lessonId: result, moduleId: module.id } },
      );
    }

    // Existing read rows predate the completion flag and were all "opened".
    await queryInterface.sequelize.query(
      "UPDATE SlideReaders SET completed = true, completedAt = createdAt WHERE completedAt IS NULL",
    );
  },

  async down(queryInterface) {
    for (const column of [
      "secondsWatched",
      "lastPosition",
      "percentWatched",
      "completed",
      "completedAt",
    ]) {
      await queryInterface.removeColumn("SlideReaders", column);
    }

    await queryInterface.removeIndex("Slides", "slides_lesson");

    for (const column of [
      "lessonId",
      "position",
      "url",
      "durationSeconds",
      "thumbnail",
      "description",
      "downloadable",
    ]) {
      await queryInterface.removeColumn("Slides", column);
    }

    await queryInterface.sequelize.query(
      "ALTER TABLE Slides MODIFY type ENUM('text','file') DEFAULT 'text'",
    );

    await queryInterface.dropTable("lessons");
  },
};
