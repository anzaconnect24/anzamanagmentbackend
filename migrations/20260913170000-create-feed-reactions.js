"use strict";

// Likes and dislikes on feed posts.
//
// One row per person per post, holding which way they went. Stored as a
// single row rather than two counters because the question the page asks is
// "have I already reacted, and how?" — a counter cannot answer that, and a
// counter is also what lets someone like the same post ten times.
//
// The unique index is the rule: one reaction each, changed by rewriting it.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("feed_reactions", {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      uuid: {
        type: Sequelize.UUID,
        allowNull: false,
        defaultValue: Sequelize.UUIDV4,
        unique: true,
      },

      postId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "feed_posts", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },

      // 1 for a like, -1 for a dislike. Taking a reaction back deletes the
      // row, so "no opinion" is the absence of a record rather than a zero.
      value: { type: Sequelize.INTEGER, allowNull: false },

      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface
      .addIndex("feed_reactions", ["postId", "userId"], {
        name: "feed_reactions_one_each",
        unique: true,
      })
      .catch(() => {});
  },

  async down(queryInterface) {
    await queryInterface.dropTable("feed_reactions");
  },
};
