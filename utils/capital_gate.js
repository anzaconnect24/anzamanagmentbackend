// The capital facilitation gatekeeper rule, applied to the general Chats
// feature.
//
// A startup and an investor may not open or use a direct conversation with each
// other through the platform until Anza's Capital Facilitation Manager has
// approved an introduction between them AND moved it to direct communication.
// Before that, contact passes through the capital opportunity's own
// conversations, where the manager moderates or monitors it. Every other pair
// of roles is unaffected.
const { Op } = require("sequelize");
const { Business, CapitalOpportunity, CapitalProvider, User } = require("../models");

const roleOf = async (user) => {
  if (!user) return null;
  if (user.role) return user.role;
  const row = await User.findByPk(user.id, { attributes: ["role"] });
  return row ? row.role : null;
};

const directContact = async (a, b) => {
  const [roleA, roleB] = await Promise.all([roleOf(a), roleOf(b)]);
  const pair = [roleA, roleB];
  if (!(pair.includes("Enterprenuer") && pair.includes("Investor"))) return { allowed: true };

  const entrepreneur = roleA === "Enterprenuer" ? a : b;
  const investor = roleA === "Investor" ? a : b;

  const [business, provider] = await Promise.all([
    Business.findOne({ where: { userId: entrepreneur.id }, attributes: ["id"] }),
    CapitalProvider.findOne({ where: { userId: investor.id }, attributes: ["id"] }),
  ]);

  if (business && provider) {
    const direct = await CapitalOpportunity.findOne({
      where: {
        businessId: business.id,
        capitalProviderId: provider.id,
        communicationMode: "direct",
        communicationPaused: false,
        introductionApprovedAt: { [Op.ne]: null },
        status: { [Op.in]: ["active", "won"] },
      },
      attributes: ["id"],
    });
    if (direct) return { allowed: true };
  }

  return {
    allowed: false,
    message:
      "Startups and investors connect through Anza's Capital Facilitation team. Request an introduction, or use the conversation on your capital opportunity.",
  };
};

module.exports = { directContact };
