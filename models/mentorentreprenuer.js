"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class MentorEntreprenuer extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      MentorEntreprenuer.belongsTo(models.User, {
        as: "Mentor",
        foreignKey: "mentorId",
      });
      MentorEntreprenuer.belongsTo(models.User, {
        as: "Entreprenuer",
        foreignKey: "entreprenuerId",
      });
      // define association here
    }
  }
  MentorEntreprenuer.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      mentorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      entreprenuerId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      approved: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      googleMeetLink: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      appointmentDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      appointmentStatus: {
        type: DataTypes.ENUM("pending", "accepted", "rejected", "completed"),
        allowNull: true,
        defaultValue: "pending",
      },
      menteeAccepted: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
    },
    {
      sequelize,
      defaultScope: {
        attributes: [
          "id",
          "uuid",
          "mentorId",
          "approved",
          "entreprenuerId",
          "googleMeetLink",
          "appointmentDate",
          "appointmentStatus",
          "menteeAccepted",
          "createdAt",
        ],
      },
      modelName: "MentorEntreprenuer",
    },
  );
  return MentorEntreprenuer;
};
