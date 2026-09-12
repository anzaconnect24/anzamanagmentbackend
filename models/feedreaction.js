"use strict";
const { Model } = require("sequelize");

// One person's reaction to one post: 1 for a like, -1 for a dislike.
// Taking it back deletes the row.
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

  FeedReaction.LIKE = 1;
  FeedReaction.DISLIKE = -1;

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
      value: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      modelName: "FeedReaction",
      tableName: "feed_reactions",
    },
  );

  return FeedReaction;
};
