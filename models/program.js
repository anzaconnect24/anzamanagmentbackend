"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Program extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Program.hasMany(models.Module, {
        foreignKey: "programId",
        sourceKey: "id",
      });
      // Which programme cohorts may open this class. None means open to all.
      Program.hasMany(models.ClassProgramAccess, {
        foreignKey: "courseId",
        sourceKey: "id",
        onDelete: "CASCADE",
      });
    }
  }
  Program.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },
      image: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      programCategory: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      // What kind of program this row is. The column already existed but was
      // missing from the model, so values sent by the client were silently
      // dropped. "grant" and "mentorship" belong to the trackers; "program"
      // (the column default) is a learn-and-grow course. Startup cohorts live
      // in cohort_programs and no longer appear here.
      //
      // NOT NULL in the database — writing an explicit null fails.
      type: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "program",
      },
      startDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      endDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Program",
    },
  );
  return Program;
};
