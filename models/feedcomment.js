"use strict";
const { Model } = require("sequelize");

// A reply to a feed post. Flat: comments do not have comments.
module.exports = (sequelize, DataTypes) => {
  class FeedComment extends Model {
    static associate(models) {
      FeedComment.belongsTo(models.FeedPost, {
        foreignKey: "postId",
        as: "post",
      });
      FeedComment.belongsTo(models.User, {
        foreignKey: "authorId",
        as: "author",
      });
    }
  }

  FeedComment.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      postId: { type: DataTypes.INTEGER, allowNull: false },
      authorId: { type: DataTypes.INTEGER, allowNull: false },
      body: { type: DataTypes.TEXT, allowNull: false },
      archivedAt: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "FeedComment",
      tableName: "feed_comments",
    },
  );

  return FeedComment;
};
