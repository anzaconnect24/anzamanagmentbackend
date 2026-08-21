"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CourseRating extends Model {
    static associate(models) {
      CourseRating.belongsTo(models.User, {
        foreignKey: "userId",
        as: "User",
      });
      CourseRating.belongsTo(models.Program, {
        foreignKey: "programId",
        as: "Program",
      });
    }
  }

  CourseRating.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      programId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 5,
        },
      },
    },
    {
      sequelize,
      modelName: "CourseRating",
      tableName: "course_ratings",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["userId", "programId"],
        },
      ],
    },
  );

  return CourseRating;
};
