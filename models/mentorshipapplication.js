"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class MentorshipApplication extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  MentorshipApplication.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      mentorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      entreprenuerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      challenges: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      mentorshipAreas: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      mentorshipMode: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      availability: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: "PENDING",
      },
    },
    {
      sequelize,
      modelName: "MentorshipApplication",
    }
  );
  return MentorshipApplication;
};
