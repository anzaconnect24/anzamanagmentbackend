const { errorResponse, successResponse } = require("../../utils/responses");
const {
  CratFinancials,
  CratMarkets,
  CratOperations,
  CratLegals,
  User,
  CratReview,
} = require("../../models");
const getUrl = require("../../utils/cloudinary_upload");
const { sendEmail } = require("../../utils/send_email");
const path = require("path");
const fs = require("fs");
// Removed unused direct user model import to avoid confusion with User model above

const publishReport = async (req, res) => {
  console.log("publish triggered");
  console.log(req.body);
  const id = req.user.id;
  try {
    // Find the user or record to update
    const user = await User.findOne({
      where: { id: id },
      include: [{ model: CratReview, as: "entrepreneurReview" }],
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Update the status in the database
    await user.update({ publishStatus: "On review" });

    res.json({
      success: true,
      message: "Published Successfully",
      status: user.publishStatus,
    });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getReportData = async (req, res) => {
  console.log("getting report");
  try {
    const { user_uuid } = req.query;
    console.log(user_uuid);
    let id = req.user.id;
    if (user_uuid) {
      const u = await User.findOne({ where: { uuid: user_uuid } });
      if (u && u.id) id = u.id;
    }

    // Retrieve the data from all relevant tables
    const financials = await CratFinancials.findAll({
      where: {
        userId: id,
      },
    });

    const markets = await CratMarkets.findAll({
      where: {
        userId: id,
      },
    });

    const operations = await CratOperations.findAll({
      where: {
        userId: id,
      },
    });

    const legals = await CratLegals.findAll({
      where: {
        userId: id,
      },
    });

    // Combine all data into a single array, converting to plain objects
    const allData = [
      ...financials.map((f) => f.toJSON()),
      ...markets.map((m) => m.toJSON()),
      ...operations.map((o) => o.toJSON()),
      ...legals.map((l) => l.toJSON()),
    ];

    // Deduplicate records: for each subDomain, keep only the record with the highest score
    // If scores are equal, keep the most recently updated one
    const deduplicatedData = {};

    allData.forEach((record) => {
      const key = record.subDomain;
      const existing = deduplicatedData[key];

      if (!existing) {
        // First occurrence of this subDomain
        deduplicatedData[key] = record;
      } else {
        // Compare scores and updatedAt to decide which to keep
        const shouldReplace =
          record.score > existing.score ||
          (record.score === existing.score &&
            new Date(record.updatedAt) > new Date(existing.updatedAt));

        if (shouldReplace) {
          deduplicatedData[key] = record;
        }
      }
    });

    // Convert back to array
    const response = Object.values(deduplicatedData);

    // Log the response for preview to verify attachment is included
    console.log(
      "Sample record with attachment:",
      response.find((r) => r.attachment) || response[0],
    );

    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const scoreCalculation = async (req, res) => {
  try {
    const { user_uuid } = req.query;
    console.log(user_uuid);

    // Always fetch the user record (by uuid if provided, else by logged-in id)
    let userRecord;
    if (user_uuid && user_uuid !== "undefined") {
      userRecord = await User.findOne({
        where: { uuid: user_uuid },
        include: [{ model: CratReview, as: "entrepreneurReview" }],
      });
    } else {
      userRecord = await User.findOne({
        where: { id: req.user.id },
        include: [{ model: CratReview, as: "entrepreneurReview" }],
      });
    }

    const id = userRecord?.id || req.user.id;
    if (!id) return errorResponse(res, "User ID is missing");

    // Retrieve the data from all relevant tables based on userId
    const financials = await CratFinancials.findAll({
      where: { userId: id },
      attributes: ["uuid", "userId", "subDomain", "score"],
    });
    const markets = await CratMarkets.findAll({
      where: { userId: id },
      attributes: ["uuid", "userId", "subDomain", "score"],
    });
    const operations = await CratOperations.findAll({
      where: { userId: id },
      attributes: ["uuid", "userId", "subDomain", "score"],
    });
    const legals = await CratLegals.findAll({
      where: { userId: id },
      attributes: ["uuid", "userId", "subDomain", "score"],
    });

    // Helper function to calculate the target score dynamically
    const calculateTargetScore = (domainData) => domainData.length * 2;

    // Calculate the dynamic target scores
    const targetScores = {
      market: calculateTargetScore(markets),
      financials: calculateTargetScore(financials),
      operations: calculateTargetScore(operations),
      legals: calculateTargetScore(legals),
    };

    // Helper function to calculate percentage and readiness status
    const calculatePercentage = (actualScore, targetScore) => {
      if (!targetScore || targetScore <= 0) {
        return { percentage: 0, status: "Not ready" };
      }
      const percentage = (actualScore / targetScore) * 100;
      const status = percentage >= 70 ? "Ready" : "Not ready";
      return { percentage, status };
    };

    // Calculate actual scores per domain
    const actualScores = {
      market: markets.reduce((sum, entry) => sum + entry.score, 0),
      financials: financials.reduce((sum, entry) => sum + entry.score, 0),
      operations: operations.reduce((sum, entry) => sum + entry.score, 0),
      legals: legals.reduce((sum, entry) => sum + entry.score, 0),
    };

    // Total scores
    const totalActualScore = Object.values(actualScores).reduce(
      (sum, score) => sum + score,
      0,
    );
    const totalTargetScore = Object.values(targetScores).reduce(
      (sum, score) => sum + score,
      0,
    );

    // Calculate AS%, TS%, percentage, and readiness status for each domain
    const marketResult = calculatePercentage(
      actualScores.market,
      targetScores.market,
    );
    const financialsResult = calculatePercentage(
      actualScores.financials,
      targetScores.financials,
    );
    const operationsResult = calculatePercentage(
      actualScores.operations,
      targetScores.operations,
    );
    const legalsResult = calculatePercentage(
      actualScores.legals,
      targetScores.legals,
    );

    // General readiness status
    const generalStatus =
      marketResult.status === "Ready" &&
      financialsResult.status === "Ready" &&
      operationsResult.status === "Ready" &&
      legalsResult.status === "Ready"
        ? "Ready"
        : "Not ready";

    // Final response
    const asPct = (part, total) => (total > 0 ? (part / total) * 100 : 0);
    const response = {
      commercial: {
        actualScore: actualScores.market,
        as_percentage: asPct(actualScores.market, totalActualScore),
        targetScore: targetScores.market,
        ts_percentage: asPct(targetScores.market, totalTargetScore),
        percentage: marketResult.percentage,
        status: marketResult.status,
      },
      financial: {
        actualScore: actualScores.financials,
        as_percentage: asPct(actualScores.financials, totalActualScore),
        targetScore: targetScores.financials,
        ts_percentage: asPct(targetScores.financials, totalTargetScore),
        percentage: financialsResult.percentage,
        status: financialsResult.status,
      },
      operations: {
        actualScore: actualScores.operations,
        as_percentage: asPct(actualScores.operations, totalActualScore),
        targetScore: targetScores.operations,
        ts_percentage: asPct(targetScores.operations, totalTargetScore),
        percentage: operationsResult.percentage,
        status: operationsResult.status,
      },
      legal: {
        actualScore: actualScores.legals,
        as_percentage: asPct(actualScores.legals, totalActualScore),
        targetScore: targetScores.legals,
        ts_percentage: asPct(targetScores.legals, totalTargetScore),
        percentage: legalsResult.percentage,
        status: legalsResult.status,
      },
      total: {
        actualScore: totalActualScore,
        as_percentage: 100,
        targetScore: totalTargetScore,
        ts_percentage: 100,
        percentage: asPct(totalActualScore, totalTargetScore),
      },
      general_status: generalStatus,
      review_status: userRecord?.entrepreneurReview?.status || null,
    };

    // Send response
    successResponse(res, response);
  } catch (error) {
    console.error("Error in score calculation:", error);
    errorResponse(res, error);
  }
};

module.exports = {
  getReportData,
  scoreCalculation,
  publishReport,
};
