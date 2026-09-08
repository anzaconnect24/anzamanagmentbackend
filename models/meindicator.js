"use strict";
const { Model } = require("sequelize");

// One indicator a programme tracks. Programme-scoped: an indicator may be
// copied out of the library, but its definition and target belong to the
// programme measuring it, so two programmes never share a target.
module.exports = (sequelize, DataTypes) => {
  class MeIndicator extends Model {
    static associate(models) {
      MeIndicator.belongsTo(models.CohortProgram, {
        foreignKey: "cohortProgramId",
        targetKey: "id",
      });
      MeIndicator.belongsTo(models.MeResult, {
        foreignKey: "resultId",
        targetKey: "id",
      });
      MeIndicator.hasMany(models.MeIndicatorValue, {
        foreignKey: "indicatorId",
        sourceKey: "id",
        onDelete: "CASCADE",
      });
    }
  }

  MeIndicator.RESULT_LEVELS = ["goal", "outcome", "output", "activity"];

  MeIndicator.TYPES = [
    "number",
    "percentage",
    "currency",
    "ratio",
    "score",
    "qualitative",
  ];

  MeIndicator.FREQUENCIES = [
    "one_time",
    "monthly",
    "quarterly",
    "semi_annual",
    "annual",
    "baseline",
    "midline",
    "endline",
    "post_programme",
  ];

  MeIndicator.STATUSES = ["active", "draft", "archived"];

  MeIndicator.init(
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      cohortProgramId: { type: DataTypes.INTEGER, allowNull: false },
      resultId: { type: DataTypes.INTEGER, allowNull: true },
      code: { type: DataTypes.STRING, allowNull: true },
      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      definition: { type: DataTypes.TEXT, allowNull: true },
      resultLevel: {
        type: DataTypes.ENUM("goal", "outcome", "output", "activity"),
        allowNull: false,
        defaultValue: "outcome",
      },
      indicatorType: {
        type: DataTypes.ENUM(
          "number",
          "percentage",
          "currency",
          "ratio",
          "score",
          "qualitative",
        ),
        allowNull: false,
        defaultValue: "number",
      },
      unit: { type: DataTypes.STRING, allowNull: true },
      baselineValue: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      targetValue: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      targetDate: { type: DataTypes.DATEONLY, allowNull: true },
      frequency: {
        type: DataTypes.ENUM(
          "one_time",
          "monthly",
          "quarterly",
          "semi_annual",
          "annual",
          "baseline",
          "midline",
          "endline",
          "post_programme",
        ),
        allowNull: false,
        defaultValue: "quarterly",
      },
      dataSource: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "manual",
      },
      responsiblePerson: { type: DataTypes.STRING, allowNull: true },
      verificationMethod: { type: DataTypes.TEXT, allowNull: true },
      calculationMethod: { type: DataTypes.TEXT, allowNull: true },
      disaggregation: {
        type: DataTypes.JSON,
        allowNull: true,
        // This MySQL maps JSON to longtext and returns it as text.
        get() {
          const raw = this.getDataValue("disaggregation");
          if (Array.isArray(raw)) return raw;
          if (typeof raw !== "string") return null;
          try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : null;
          } catch {
            return null;
          }
        },
      },
      higherIsBetter: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      status: {
        type: DataTypes.ENUM("active", "draft", "archived"),
        allowNull: false,
        defaultValue: "active",
      },
      notes: { type: DataTypes.TEXT, allowNull: true },
      position: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      createdById: { type: DataTypes.INTEGER, allowNull: true },
      archivedAt: { type: DataTypes.DATE, allowNull: true },
    },
    { sequelize, modelName: "MeIndicator", tableName: "me_indicators" },
  );

  return MeIndicator;
};
