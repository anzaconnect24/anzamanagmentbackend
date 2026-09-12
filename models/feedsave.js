"use strict";
const { Model } = require("sequelize");

// One person bookmarking one post. Private to them: nobody is told what you
// saved, and the count on the post is your own doing, not a public tally.
module.exports = (sequelize, DataTypes) => {
  class FeedSave extends Model {
    static associate(models) {
      FeedSave.belongsTo(models.FeedPost, { foreignKey: "postId", as: "post" });
      FeedSave.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    }
  }

  FeedSave.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      postId: { type: DataTypes.INTEGER, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: false },
    },
    { sequelize, modelName: "FeedSave", tableName: "feed_saves" },
  );

  return FeedSave;
};
