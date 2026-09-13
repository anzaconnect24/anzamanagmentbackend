// Human-readable references: CR-2026-0007 for a capital request and
// CAP-2026-0041 for an opportunity, numbered within the year.
//
// The number is the highest already used this year plus one, read inside the
// caller's transaction. Both columns are unique, so two simultaneous creations
// cannot both keep the same number - the loser's insert fails and retries.
const { Op } = require("sequelize");

const next = async (Model, prefix, transaction) => {
  const year = new Date().getFullYear();
  const stem = `${prefix}-${year}-`;

  const last = await Model.findOne({
    where: { reference: { [Op.like]: `${stem}%` } },
    attributes: ["reference"],
    order: [["reference", "DESC"]],
    transaction,
  });

  const number = last ? Number(String(last.reference).slice(stem.length)) + 1 : 1;
  return `${stem}${String(number).padStart(4, "0")}`;
};

// Create a row with a fresh reference, retrying if another request took the
// same number in the meantime.
const createWithReference = async (Model, prefix, values, { transaction } = {}) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const reference = await next(Model, prefix, transaction);
    try {
      return await Model.create({ ...values, reference }, { transaction });
    } catch (error) {
      const duplicate = error && error.name === "SequelizeUniqueConstraintError";
      if (!duplicate || transaction) throw error;
    }
  }
  throw new Error(`Could not allocate a ${prefix} reference`);
};

module.exports = { createWithReference };
