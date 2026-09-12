"use strict";
const { Model } = require("sequelize");

// One person's reaction to one post, held by name. Taking it back deletes
// the row, so "no opinion" is the absence of a record rather than a value.
module.exports = (sequelize, DataTypes) => {
  class FeedReaction extends Model {
    static associate(models) {
      FeedReaction.belongsTo(models.FeedPost, {
        foreignKey: "postId",
        as: "post",
      });
      FeedReaction.belongsTo(models.User, {
        foreignKey: "userId",
        as: "user",
      });
    }
  }

  // What a reader can say about a post without writing a comment. Ordered as
  // the page shows them: the two thumbs first, the rest behind the picker.
  FeedReaction.KINDS = [
    "like",
    "dislike",
    "love",
    "celebrate",
    "insightful",
  ];

  FeedReaction.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      postId: { type: DataTypes.INTEGER, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      kind: { type: DataTypes.STRING, allowNull: false },
    },
    {
      sequelize,
      modelName: "FeedReaction",
      tableName: "feed_reactions",
    },
  );

  return FeedReaction;
};
