"use strict";
const { Model } = require("sequelize");

// One startup finishing one class. Absence of a row means "not finished".
module.exports = (sequelize, DataTypes) => {
  class CourseCompletion extends Model {
    static associate(models) {
      CourseCompletion.belongsTo(models.Business, {
        foreignKey: "businessId",
      });
      CourseCompletion.belongsTo(models.Program, {
        foreignKey: "courseId",
      });
    }
  }

  CourseCompletion.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      businessId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      courseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "CourseCompletion",
      tableName: "course_completions",
    },
  );

  return CourseCompletion;
};
