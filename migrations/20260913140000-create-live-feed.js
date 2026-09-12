"use strict";

// The live feed: one place where everyone on the platform - startups,
// mentors, investors, advisors, finance, M&E and admins alike - can post and
// reply to each other.
//
// Deliberately flat. A post has an author, a body and optionally one image;
// a comment has an author and a body. No threads inside threads, no groups,
// no visibility rules: a feed that needs a manual to read is not a feed.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("feed_posts", {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      uuid: {
        type: Sequelize.UUID,
        allowNull: false,
        defaultValue: Sequelize.UUIDV4,
        unique: true,
      },

      authorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },

      // An optional headline. Most posts are a thought, not an article, so
      // the body is what is required and the title is what is not.
      title: { type: Sequelize.STRING, allowNull: true },
      body: { type: Sequelize.TEXT, allowNull: false },
      imageUrl: { type: Sequelize.TEXT, allowNull: true },

      // Taken down rather than destroyed: a removed post is still evidence of
      // what was said, which matters if it is removed for being said.
      archivedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    await queryInterface.createTable("feed_comments", {
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
      authorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },

      body: { type: Sequelize.TEXT, allowNull: false },

      archivedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE },
    });

    // The feed is read newest first, always. That is the only query it has.
    await queryInterface
      .addIndex("feed_posts", ["archivedAt", "createdAt"], {
        name: "feed_posts_newest_first",
      })
      .catch(() => {});

    await queryInterface
      .addIndex("feed_comments", ["postId", "createdAt"], {
        name: "feed_comments_by_post",
      })
      .catch(() => {});
  },

  async down(queryInterface) {
    await queryInterface.dropTable("feed_comments");
    await queryInterface.dropTable("feed_posts");
  },
};
