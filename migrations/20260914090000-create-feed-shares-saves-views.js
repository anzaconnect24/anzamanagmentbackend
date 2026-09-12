"use strict";

// The rest of what a post carries: reposts, saves and how many people have
// actually seen it.
//
// A repost is a post in its own right that points at another — not a counter
// — so it appears in the feed under the name of whoever reshared it, and can
// be taken back by deleting it like any other post.
//
// A save is private to the person who made it. A view is one person having
// had the post on screen, counted once however often they scroll past.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("feed_posts", "repostOfId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "feed_posts", key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    await queryInterface.createTable("feed_saves", {
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
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.createTable("feed_views", {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
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
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    // Saved once, seen once: both are "this person, this post", so both are
    // unique on the pair. Scrolling past a post again is not a new view.
    await queryInterface
      .addIndex("feed_saves", ["postId", "userId"], {
        name: "feed_saves_one_each",
        unique: true,
      })
      .catch(() => {});

    await queryInterface
      .addIndex("feed_views", ["postId", "userId"], {
        name: "feed_views_one_each",
        unique: true,
      })
      .catch(() => {});

    await queryInterface
      .addIndex("feed_posts", ["repostOfId"], {
        name: "feed_posts_repost_of",
      })
      .catch(() => {});
  },

  async down(queryInterface) {
    await queryInterface.dropTable("feed_views");
    await queryInterface.dropTable("feed_saves");
    await queryInterface.removeColumn("feed_posts", "repostOfId");
  },
};
