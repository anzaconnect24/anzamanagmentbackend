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
