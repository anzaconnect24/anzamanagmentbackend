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

const getApplicationData = async (req, res) => {
  console.log("application data");
  try {
    // Fetch all users whose publishStatus is 'On review'
    const users = await User.findAll({
      where: { publishStatus: "On review" },
      attributes: ["id", "name", "versionCount"], // Include 'id' along with other attributes
      include: [
        {
          model: CratFinancials,
          attributes: ["subDomain", "score"],
        },
        {
          model: CratMarkets,
          attributes: ["subDomain", "score"],
        },
        {
          model: CratOperations,
          attributes: ["subDomain", "score"],
        },
        {
          model: CratLegals,
          attributes: ["subDomain", "score"],
        },
      ],
    });

    // Process each user to calculate readiness and total percentage while including domain data
    const userData = users.map((user) => {
      const financial = user.CratFinancials || [];
      const market = user.CratMarkets || [];
      const operations = user.CratOperations || [];
      const legal = user.CratLegals || [];

      // Helper function to calculate the target score dynamically
      const calculateTargetScore = (domainData) => domainData.length * 2;

      // Calculate the target scores
      const targetScores = {
        market: calculateTargetScore(market),
        financial: calculateTargetScore(financial),
        operations: calculateTargetScore(operations),
        legal: calculateTargetScore(legal),
      };

      // Calculate the actual scores
      const actualScores = {
        market: market.reduce((sum, entry) => sum + entry.score, 0),
        financials: financial.reduce((sum, entry) => sum + entry.score, 0),
        operations: operations.reduce((sum, entry) => sum + entry.score, 0),
        legal: legal.reduce((sum, entry) => sum + entry.score, 0),
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

      // Calculate the total percentage
      let totalPercentage = (totalActualScore / totalTargetScore) * 100;

      // Determine readiness based on total percentage
      const readiness = totalPercentage >= 70 ? "Ready" : "Not ready";
      totalPercentage = totalPercentage.toFixed(2);

      return {
        id: user.id, // Include the user ID in the response
        name: user.name,
        reviewCount: user.versionCount,
        readiness,
        totalPercentage,
      };
    });

    console.log(userData);

    // Send the processed user data as the response
    successResponse(res, userData);
  } catch (error) {
    errorResponse(res, error);
  }
};

const getReportDataById = async (req, res) => {
  console.log("getting report by ID");
  try {
    // Extract the ID from the request body
    const { id } = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ message: "ID is required in the request body" });
    }

    // Retrieve the data from all relevant tables based on the provided ID
    const financials = await CratFinancials.findAll({
      where: {
        userId: id, // Use the ID sent in the request body
      },
      attributes: [
        "uuid",
        "userId",
        "subDomain",
        "score",
        "comments",
        "attachment",
        "reviewCount",
        "reviewer_comment",
        "customerComment",
        "adminComment",
        "reviewerComment",
        "rating",
      ],
    });

    const markets = await CratMarkets.findAll({
      where: {
        userId: id, // Use the ID sent in the request body
      },
      attributes: [
        "uuid",
        "userId",
        "subDomain",
        "score",
        "comments",
        "attachment",
        "reviewCount",
        "reviewer_comment",
        "customerComment",
        "adminComment",
        "reviewerComment",
        "rating",
      ],
    });

    const operations = await CratOperations.findAll({
      where: {
        userId: id, // Use the ID sent in the request body
      },
      attributes: [
        "uuid",
        "userId",
        "subDomain",
        "score",
        "comments",
        "attachment",
        "reviewCount",
        "reviewer_comment",
        "customerComment",
        "adminComment",
        "reviewerComment",
        "rating",
      ],
    });

    const legals = await CratLegals.findAll({
      where: {
        userId: id, // Use the ID sent in the request body
      },
      attributes: [
        "uuid",
        "userId",
        "subDomain",
        "score",
        "comments",
        "attachment",
        "reviewCount",
        "reviewer_comment",
        "customerComment",
        "adminComment",
        "reviewerComment",
        "rating",
      ],
    });

    // Combine all data into a single array
    const allData = [...financials, ...markets, ...operations, ...legals];

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

    // Log the response for preview
    console.log("Deduplicated response:", response);

    // Send the response
    successResponse(res, response);
  } catch (error) {
    // Handle error response
    errorResponse(res, error);
  }
};

const updateSubDomainData = async (req, res) => {
  console.log("Update SubDomain API triggered");
  try {
    const {
      subDomain,
      score,
      reviewer_comment,
      reviewerComment,
      rating,
      userId,
    } = req.body; // Accept both reviewer_comment and reviewerComment for compatibility

    console.log("Request body:", req.body);

    // Validate input data
    if (!subDomain || score === undefined) {
      return res
        .status(400)
        .json({ message: "SubDomain and score are required" });
    }

    // Scan through the modules and find the one that matches the subDomain
    let Model;
    const modules = [CratFinancials, CratMarkets, CratOperations, CratLegals];

    // Find the appropriate model based on subDomain
    for (let module of modules) {
      const record = await module.findOne({
        where: {
          userId: userId, // Use fixed userId
          subDomain: subDomain,
        },
      });

      if (record) {
        // If we find a record, use this model to update the data
        Model = module;
        console.log(`Model chosen: ${module.name}`); // Log the chosen model's name
        break;
      }
    }

    if (!Model) {
      console.log("No matching model found for subDomain:", subDomain);
      return res
        .status(404)
        .json({ message: "No matching record found for the given subDomain" });
    }

    // Find the existing record for the user and subDomain in the chosen model
    const record = await Model.findOne({
      where: {
        userId: userId, // Use fixed userId
        subDomain: subDomain,
      },
    });

    if (!record) {
      return res
        .status(404)
        .json({ message: "Record not found for the given subDomain" });
    }

    console.log("Found record:", record);

    // Update the score and reviewer comment fields
    // Use reviewerComment (camelCase) as the primary field, fallback to reviewer_comment for backward compatibility
    const commentToSave = reviewerComment || reviewer_comment;

    record.score = score;
    record.rating = rating;
    if (commentToSave !== undefined && commentToSave !== null) {
      record.reviewerComment = commentToSave; // Use the camelCase field
      record.reviewer_comment = commentToSave; // Also update the old field for backward compatibility
    }

    // Save the updated record
    await record.save();

    // Send a success response
    console.log("Updated record:", record);
    return res
      .status(200)
      .json({ message: "SubDomain data updated successfully", data: record });
  } catch (error) {
    console.error("Error updating subDomain data:", error);
    return res
      .status(500)
      .json({ message: "Error updating subDomain data", error: error.message });
  }
};

const reviewerPublish = async (req, res) => {
  console.log("Processing reviewerPublish...");
  try {
    // Access userId and file from the request
    const { userId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Generate the PDF URL from the file attachment
    let reportPdfUrl = await getUrl({ file });

    // Find the user by ID
    const user = await User.findOne({
      where: {
        id: userId,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update the record in the Users table
    const updatedUser = await User.update(
      {
        reportPdf: reportPdfUrl, // Update the report PDF link
        versionCount: user.versionCount + 1, // Increment the review count
        publishStatus: "Draft", // Set publish status to Draft
      },
      {
        where: {
          id: userId,
        },
      },
    );

    // Clear reviewer comment fields in all relevant tables (both old and new fields)
    const modules = [CratFinancials, CratMarkets, CratOperations, CratLegals];

    for (let module of modules) {
      await module.update(
        {
          reviewer_comment: null, // Clear old snake_case field
          reviewerComment: null, // Clear new camelCase field
        },
        {
          where: {
            userId: userId, // Make sure to clear only for the specific user
          },
        },
      );
      console.log(`Cleared reviewer comments for table: ${module.name}`);
    }

    // Send success response
    successResponse(res, updatedUser);
  } catch (error) {
    console.error("Error in reviewerPublish:", error);
    errorResponse(res, error);
  }
};

module.exports = {
  getApplicationData,
  getReportDataById,
  updateSubDomainData,
  reviewerPublish,
};
