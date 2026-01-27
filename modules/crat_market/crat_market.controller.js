const { errorResponse, successResponse } = require("../../utils/responses");
const { CratMarkets, User } = require("../../models");
const { logCratUpdate } = require("../../utils/activity_logger");
const getUrl = require("../../utils/cloudinary_upload");
const { sendEmail } = require("../../utils/send_email");
const path = require("path");
const fs = require("fs");

// Helper to normalize incoming rating values to ENUM 'Yes' | 'No' | 'Maybe'
const normalizeRating = (val) => {
  if (val === null || val === undefined) return undefined;
  const v = String(val).trim().toLowerCase();
  if (["yes", "y", "true", "1"].includes(v)) return "Yes";
  if (["no", "n", "false", "0"].includes(v)) return "No";
  if (["maybe", "neutral", "m"].includes(v)) return "Maybe";
  // Accept already proper case exactly
  if (["Yes", "No", "Maybe"].includes(val)) return val;
  return undefined; // invalid -> ignore
};

const createMarket = async (req, res) => {
  console.log("in here 1");
  try {
    const body = req.body;
    const id = req.user.id;

    // Flatten the nested arrays in the body object
    const allItems = Object.values(body).flat();

    // Ensure allItems is an array
    if (!Array.isArray(allItems) || allItems.length === 0) {
      return res.status(400).json({ message: "Invalid data format" });
    }

    // Create records
    const responses = await Promise.all(
      allItems.map(async (item) => {
        const rating = normalizeRating(item.rating) || "No"; // default to 'No' if invalid/empty
        return CratMarkets.create({
          userId: id,
          subDomain: item.subDomain,
          score: item.score,
          rating,
        });
      }),
    );

    successResponse(res, responses);
  } catch (error) {
    // Send error response
    errorResponse(res, error);
  }
};

const getMarketData = async (req, res) => {
  try {
    const id = req.user.id;

    // Retrieve the data, including uuid and userId
    const response = await CratMarkets.findAll({
      where: {
        userId: id,
      },
    });

    successResponse(res, response);
  } catch (error) {
    console.log(error);
    errorResponse(res, error);
  }
};

const updateMarketData = async (req, res) => {
  /* Bulk update endpoint – now prefers uuid when provided for precision.
     Falls back to (userId, subDomain) match for backward compatibility. */
  try {
    const body = req.body;
    const id = req.user.id;
    const user = req.user;

    if (typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({ message: "Invalid data format" });
    }

    // (normalizeRating helper reused)

    const updatePromises = [];
    const updatedSubDomains = [];

    for (const section of Object.keys(body)) {
      const items = body[section];
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        const rating = normalizeRating(item.rating);
        const payload = {
          score: item.score,
          description: item.description,
          customerComment: item.customerComment,
          reviewerComment: item.reviewerComment,
        };
        if (rating) payload.rating = rating; // only set if valid

        // Track updated subdomains for logging
        if (item.subDomain) {
          updatedSubDomains.push(item.subDomain);
        }

        if (item.uuid) {
          // Precise update by uuid + ownership check
          updatePromises.push(
            (async () => {
              const record = await CratMarkets.findOne({
                where: { uuid: item.uuid, userId: id },
              });
              if (!record)
                return { uuid: item.uuid, updated: false, reason: "Not found" };
              await record.update(payload);
              return { uuid: item.uuid, updated: true };
            })(),
          );
        } else if (item.subDomain) {
          updatePromises.push(
            CratMarkets.update(payload, {
              where: { userId: id, subDomain: item.subDomain },
              returning: true,
            }),
          );
        }
      }
    }

    const results = await Promise.all(updatePromises);

    // Log the CRAT update
    if (updatedSubDomains.length > 0) {
      await logCratUpdate(
        user.id,
        "CratMarkets",
        updatedSubDomains.join(", "),
        user.name,
      );
    }

    successResponse(res, { updated: results.length, results });
  } catch (error) {
    console.error("Error updating data:", error);
    errorResponse(res, error);
  }
};
const update = async (req, res) => {
  console.log("Update API triggered");
  try {
    const body = req.body;
    const { uuid } = req.params;
    const userId = req.user && req.user.id;
    const userRole = req.user && req.user.role;

    // Staff/Reviewers can update any record (for reviewer comments)
    // Entrepreneurs can only update their own records
    const whereClause = {
      uuid,
    };

    // Only add userId filter if user is not Staff (reviewers should access all records)
    if (userRole !== "Staff" && userId) {
      whereClause.userId = userId;
    }

    const cratMarket = await CratMarkets.findOne({
      where: whereClause,
    });

    if (!cratMarket) {
      return res.status(404).json({ message: "Record not found" });
    }
    // If rating present, normalize before update
    if (Object.prototype.hasOwnProperty.call(body, "rating")) {
      const nr = normalizeRating(body.rating);
      if (nr) body.rating = nr;
      else delete body.rating; // prevent invalid ENUM write
    }
    const response = await cratMarket.update(body);

    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
    console.error("Error updating data:", error);
  }
};
const createPdfAttachment = async (req, res) => {
  /* Updated to allow attaching by uuid (preferred). Falls back to subDomain for legacy calls. */
  try {
    const { uuid, subDomain } = req.body;
    const userId = req.user.id;
    if (!uuid && !subDomain) {
      return res
        .status(400)
        .json({ message: "uuid is required (legacy subDomain supported)" });
    }

    const fileUrl = await getUrl(req);

    const where = uuid ? { uuid, userId } : { subDomain, userId };
    const application = await CratMarkets.findOne({ where });
    if (!application)
      return res.status(404).json({ message: "Record not found" });

    await application.update({ attachment: fileUrl });
    successResponse(res, application);
  } catch (error) {
    errorResponse(res, error);
  }
};

const deletePdfAttachment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { uuid, subDomain, attachment } = req.body; // support both
    if (!attachment)
      return res.status(400).json({ message: "attachment URL is required" });

    const where = uuid ? { uuid, userId } : { subDomain, userId };
    const application = await CratMarkets.findOne({ where });
    if (!application)
      return res.status(404).json({ message: "Record not found" });

    const attachmentFileName = path.basename(attachment);
    const attachmentPath = path.join(
      __dirname,
      "../../files/",
      attachmentFileName,
    );
    if (fs.existsSync(attachmentPath)) {
      try {
        fs.unlinkSync(attachmentPath);
      } catch (_) {}
    }

    await application.update({ attachment: null });
    successResponse(res, {
      message: "Attachment deleted",
      uuid: application.uuid,
    });
  } catch (error) {
    console.error("Error deleting attachment:", error);
    errorResponse(res, error);
  }
};

module.exports = {
  createMarket,
  getMarketData,
  updateMarketData,
  update,
  createPdfAttachment,
  deletePdfAttachment,
};
