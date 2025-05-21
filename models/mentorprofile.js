"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class MentorProfile extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      MentorProfile.belongsTo(models.User);
      MentorProfile.belongsTo(models.BusinessSector);
    }
  }
  MentorProfile.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      linkedinURL: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      organisation: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      position: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      areasOfExperties: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      mentorAvailability: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      mentorHours: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      businessSectorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      location: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      language: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      mentorshipFocus: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      smeFocus: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
      },
      mentoringFormat: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "MentorProfile",
    }
  );
  return MentorProfile;
};
