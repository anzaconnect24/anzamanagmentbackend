"use strict";
const { Model } = require("sequelize");

// One person having had a post on screen. Counted once per person however
// often they scroll past it, so the number on a post is people reached — not
// impressions, which would only measure how long the feed is.
module.exports = (sequelize, DataTypes) => {
  class FeedView extends Model {
    static associate(models) {
      FeedView.belongsTo(models.FeedPost, { foreignKey: "postId", as: "post" });
      FeedView.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    }
  }

  FeedView.init(
    {
      postId: { type: DataTypes.INTEGER, allowNull: false },
      userId: { type: DataTypes.INTEGER, allowNull: false },
    },
    { sequelize, modelName: "FeedView", tableName: "feed_views" },
  );

  return FeedView;
};
