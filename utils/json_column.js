// A JSON column that reads back as a value, not as text.
//
// This MariaDB maps JSON to LONGTEXT and hands the value back as a string, so a
// model getter parses it. Kept out of models/, which loads every file there as
// a model.
const jsonColumn = (DataTypes, field, fallback = null) => ({
  type: DataTypes.JSON,
  allowNull: true,
  get() {
    const raw = this.getDataValue(field);
    if (raw === null || raw === undefined) return fallback;
    if (typeof raw !== "string") return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
});

module.exports = { jsonColumn };
