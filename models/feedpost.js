"use strict";
const { Model } = require("sequelize");

// A post on the platform-wide live feed.
module.exports = (sequelize, DataTypes) => {
  class FeedPost extends Model {
    static associate(models) {
      FeedPost.belongsTo(models.User, {
        foreignKey: "authorId",
        as: "author",
      });

      FeedPost.hasMany(models.FeedComment, {
        foreignKey: "postId",
        as: "comments",
        onDelete: "cascade",
      });

      // A repost is a post pointing at another, so it appears in the feed
      // under the name of whoever reshared it.
      FeedPost.belongsTo(models.FeedPost, {
        foreignKey: "repostOfId",
        as: "repostOf",
      });
      FeedPost.hasMany(models.FeedPost, {
        foreignKey: "repostOfId",
        as: "reposts",
      });

      FeedPost.hasMany(models.FeedSave, {
        foreignKey: "postId",
        as: "saves",
        onDelete: "cascade",
      });
      FeedPost.hasMany(models.FeedView, {
        foreignKey: "postId",
        as: "views",
        onDelete: "cascade",
      });
    }
  }

  FeedPost.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      authorId: { type: DataTypes.INTEGER, allowNull: false },
      repostOfId: DataTypes.INTEGER,
      title: DataTypes.STRING,
      body: { type: DataTypes.TEXT, allowNull: false },
      imageUrl: DataTypes.TEXT,
      archivedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "FeedPost",
      tableName: "feed_posts",
    },
  );

  return FeedPost;
};
