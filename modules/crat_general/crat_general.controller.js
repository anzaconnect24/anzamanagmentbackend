const { errorResponse, successResponse } = require("../../utils/responses");
const {
  CratFinancials,
  CratMarkets,
  CratOperations,
  CratLegals,
  User,
} = require("../../models");
const getUrl = require("../../utils/cloudinary_upload");
const { sendEmail } = require("../../utils/send_email");
const path = require("path");
const fs = require("fs");

const publishReport = async (req, res) => {
  console.log("publish triggered");
  console.log(req.body);
  const id = req.user.id;
  try {
    // Find the user or record to update
    const user = await User.findOne({ where: { id: id } });

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
    const id = req.user.id;

    // Retrieve the data from all relevant tables
    const financials = await CratFinancials.findAll({
      where: {
        userId: id,
      },
      attributes: ["uuid", "userId", "subDomain", "score"], // Only fetch subDomain, score, userId, and uuid
    });

    const markets = await CratMarkets.findAll({
      where: {
        userId: id,
      },
      attributes: ["uuid", "userId", "subDomain", "score"], // Only fetch subDomain, score, userId, and uuid
    });

    const operations = await CratOperations.findAll({
      where: {
        userId: id,
      },
      attributes: ["uuid", "userId", "subDomain", "score"], // Only fetch subDomain, score, userId, and uuid
    });

    const legals = await CratLegals.findAll({
      where: {
        userId: id,
      },
      attributes: ["uuid", "userId", "subDomain", "score"], // Only fetch subDomain, score, userId, and uuid
    });

    // Combine all data into a single array
    const response = [...financials, ...markets, ...operations, ...legals];

    // Log the response for preview
    console.log(response);

    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const scoreCalculation = async (req, res) => {
  try {
    const { user_uuid } = req.query;
    let id;
    console.log(user_uuid);
    if (user_uuid != "undefined") {
      const user = await User.findOne({
        where: {
          uuid: user_uuid,
        },
      });
      id = user.id;
    } else {
      id = req.user.id;
    }
    // Ensure that userId is available
    if (!id) {
      return errorResponse(res, "User ID is missing");
    }

    console.log("id", id);

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
      0
    );
    const totalTargetScore = Object.values(targetScores).reduce(
      (sum, score) => sum + score,
      0
    );

    // Calculate AS%, TS%, percentage, and readiness status for each domain
    const marketResult = calculatePercentage(
      actualScores.market,
      targetScores.market
    );
    const financialsResult = calculatePercentage(
      actualScores.financials,
      targetScores.financials
    );
    const operationsResult = calculatePercentage(
      actualScores.operations,
      targetScores.operations
    );
    const legalsResult = calculatePercentage(
      actualScores.legals,
      targetScores.legals
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
    const response = {
      commercial: {
        actualScore: actualScores.market,
        as_percentage: (actualScores.market / totalActualScore) * 100,
        targetScore: targetScores.market,
        ts_percentage: (targetScores.market / totalTargetScore) * 100,
        percentage: marketResult.percentage,
        status: marketResult.status,
      },
      financial: {
        actualScore: actualScores.financials,
        as_percentage: (actualScores.financials / totalActualScore) * 100,
        targetScore: targetScores.financials,
        ts_percentage: (targetScores.financials / totalTargetScore) * 100,
        percentage: financialsResult.percentage,
        status: financialsResult.status,
      },
      operations: {
        actualScore: actualScores.operations,
        as_percentage: (actualScores.operations / totalActualScore) * 100,
        targetScore: targetScores.operations,
        ts_percentage: (targetScores.operations / totalTargetScore) * 100,
        percentage: operationsResult.percentage,
        status: operationsResult.status,
      },
      legal: {
        actualScore: actualScores.legals,
        as_percentage: (actualScores.legals / totalActualScore) * 100,
        targetScore: targetScores.legals,
        ts_percentage: (targetScores.legals / totalTargetScore) * 100,
        percentage: legalsResult.percentage,
        status: legalsResult.status,
      },
      total: {
        actualScore: totalActualScore,
        as_percentage: 100,
        targetScore: totalTargetScore,
        ts_percentage: 100,
        percentage: (totalActualScore / totalTargetScore) * 100,
      },
      general_status: generalStatus,
    };

    // console.log(response);

    // Send response
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  getReportData,
  scoreCalculation,
  publishReport,
};
