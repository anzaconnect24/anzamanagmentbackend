// Brings the platform's existing capital activity into capital facilitation.
//
//   npm run backfill:capital
//
// 1. Every investor account becomes a capital provider (from its investor
//    profile), so it can be matched without being typed in again.
// 2. Every existing investment request becomes a capital request in the review
//    queue.
// 3. Every investor interest in a business becomes an introduction request
//    waiting for the Capital Facilitation Manager.
//
// Safe to run more than once: each step skips what it has already brought over.
// No notifications are sent for historical records.
require("dotenv").config();
const { Op } = require("sequelize");
const db = require("../models");
const { providerFromInvestor } = require("../modules/capital/capital.shared");
const { mirrorInvestmentInterest, mirrorInvestmentRequest } = require("../modules/capital/capital.hooks");

// Audit rows written by the backfill say so.
const system = { user: { id: 0, role: "system" }, headers: { "user-agent": "scripts/backfill_capital.js" } };

(async () => {
  const summary = { providersCreated: 0, requestsMirrored: 0, requestsSkipped: 0, introductionsMirrored: 0, introductionsSkipped: 0 };

  // 1. Providers
  const investors = await db.User.findAll({
    where: { role: "Investor" },
    attributes: ["id", "name", "email", "phone", "role", "activated"],
    include: [{ model: db.InvestorProfile, required: false, include: [{ model: db.BusinessSector, attributes: ["name"] }] }],
  });
  const linked = new Set((await db.CapitalProvider.findAll({ where: { userId: { [Op.ne]: null } }, attributes: ["userId"], raw: true })).map((row) => row.userId));
  const missing = investors.filter((user) => !linked.has(user.id));
  if (missing.length) {
    await db.CapitalProvider.bulkCreate(missing.map((user) => ({ ...providerFromInvestor(user, user.InvestorProfile), status: user.activated ? "active" : "inactive" })));
  }
  summary.providersCreated = missing.length;

  // 2. Investment requests
  for (const investmentRequest of await db.BusinessInvestmentRequest.findAll({ order: [["id", "ASC"]] })) {
    const before = await db.CapitalRequest.count({ where: { legacyRequestId: investmentRequest.id } });
    const mirrored = await mirrorInvestmentRequest(system, investmentRequest, { notifyManager: false });
    if (mirrored && !before) summary.requestsMirrored += 1;
    else summary.requestsSkipped += 1;
  }

  // 3. Investor interest
  for (const interest of await db.InvestmentInterest.findAll({ order: [["id", "ASC"]] })) {
    const business = await db.Business.findByPk(interest.businessId);
    const before = await db.CapitalIntroduction.count({ where: { legacyInterestId: interest.id } });
    const mirrored = await mirrorInvestmentInterest(system, interest, business, { notifyManager: false });
    if (mirrored && !before) summary.introductionsMirrored += 1;
    else summary.introductionsSkipped += 1;
  }

  console.log("Capital facilitation backfill:", summary);
  await db.sequelize.close();
})().catch(async (error) => {
  console.error("Backfill failed:", error);
  await db.sequelize.close();
  process.exit(1);
});
