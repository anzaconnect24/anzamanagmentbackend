"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class BusinessSector extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      BusinessSector.hasMany(models.Business, { onDelete: "cascade" });
      BusinessSector.hasMany(models.InvestorProfile);
      BusinessSector.hasMany(models.MentorProfile);
      // define association here
    }
  }
  BusinessSector.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "BusinessSector",
    }
  );
  return BusinessSector;
};
