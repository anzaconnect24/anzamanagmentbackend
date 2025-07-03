"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class SlideReader extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      SlideReader.belongsTo(models.User);
      SlideReader.belongsTo(models.Slide);
    }
  }
  SlideReader.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      slideId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "SlideReader",
    }
  );
  return SlideReader;
};
