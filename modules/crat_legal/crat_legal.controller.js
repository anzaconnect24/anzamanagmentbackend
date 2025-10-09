const { errorResponse, successResponse } = require("../../utils/responses");
const { CratLegals, User } = require("../../models");
const getUrl = require("../../utils/cloudinary_upload");
const { sendEmail } = require("../../utils/send_email");
const path = require("path");
const fs = require("fs");

const createLegal = async (req, res) => {
  console.log("create legal api");
  try {
    const body = req.body;
    const id = req.user.id;

    // Flatten the nested arrays in the body object
    const allItems = Object.values(body).flat();

    // Ensure allItems is an array
    if (!Array.isArray(allItems) || allItems.length === 0) {
      console.log("Invalid data format");
      return res.status(400).json({ message: "Invalid data format" });
    }

    // Create records
    const responses = await Promise.all(
      allItems.map((item) =>
        CratLegals.create({
          userId: id,
          subDomain: item.subDomain,
          score: item.score,
          rating: item.rating,
        })
      )
    );

    successResponse(res, responses);
  } catch (error) {
    // Send error response
    errorResponse(res, error);
  }
};

const getLegalData = async (req, res) => {
  try {
    const id = req.user.id;

    // Retrieve the data, including uuid and userId
    const response = await CratLegals.findAll({
      where: {
        userId: id,
      },
    });

    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const updateLegallData = async (req, res) => {
  console.log("Update API triggered");
  try {
    const body = req.body;
    const id = req.user.id;

    // Ensure body is an object with arrays
    if (typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({ message: "Invalid data format" });
    }

    // Collect all items to update – prefer uuid if present, fallback to subDomain
    const updatePromises = [];
    for (const section of Object.keys(body)) {
      for (const item of body[section]) {
        const where = { userId: id };
        if (item.uuid) {
          where.uuid = item.uuid;
        } else if (item.subDomain) {
          where.subDomain = item.subDomain; // legacy fallback
        } else {
          continue; // skip invalid item
        }
        updatePromises.push(
          CratLegals.update(
            {
              score: item.score,
              rating: item.rating,
              description: item.description,
              customerComment: item.customerComment,
              reviewerComment: item.reviewerComment,
            },
            { where }
          )
        );
      }
    }

    const responses = await Promise.all(updatePromises);
    successResponse(res, responses);
  } catch (error) {
    errorResponse(res, error);
    console.error("Error updating data:", error);
  }
};
const update = async (req, res) => {
  console.log("Update API triggered");
  try {
    const body = req.body;
    const { uuid } = req.params;

    const cratLegal = await CratLegals.findOne({
      where: {
        uuid,
      },
    });

    if (!cratLegal) {
      return res.status(404).json({ message: "Record not found" });
    }
    const response = await cratLegal.update(body);

    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
    console.error("Error updating data:", error);
  }
};
const createPdfAttachment = async (req, res) => {
  console.log("trying attachment");
  try {
    const { subDomain, uuid } = req.body; // Prefer uuid if provided
    const id = req.user.id;
    const attachment = await getUrl(req);

    const where = { userId: id };
    if (uuid) where.uuid = uuid;
    else if (subDomain) where.subDomain = subDomain;
    else return res.status(400).json({ message: "uuid or subDomain required" });

    const application = await CratLegals.findOne({ where });
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    const response = await application.update({ attachment });
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, error);
  }
};

const deletePdfAttachment = async (req, res) => {
  console.log("delete api");
  try {
    const { subDomain, uuid, attachment } = req.body;
    const id = req.user.id;

    const where = { userId: id };
    if (uuid) where.uuid = uuid;
    else if (subDomain) where.subDomain = subDomain;
    else return res.status(400).json({ message: "uuid or subDomain required" });

    const application = await CratLegals.findOne({ where });
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    // If a direct attachment URL was passed, attempt to remove underlying file (best-effort)
    if (attachment) {
      try {
        const attachmentFileName = path.basename(attachment);
        const attachmentPath = path.join(
          __dirname,
          "../../files/",
          attachmentFileName
        );
        if (fs.existsSync(attachmentPath)) {
          fs.unlinkSync(attachmentPath);
          console.log(`File ${attachmentPath} deleted successfully.`);
        }
      } catch (fileErr) {
        console.log("Non-fatal file deletion error:", fileErr.message);
      }
    }

    await application.update({ attachment: null });
    res.json({ message: "Attachment deleted successfully" });
  } catch (error) {
    console.error("Error deleting attachment:", error);
    res.status(500).json({ message: "Error deleting attachment" });
  }
};

module.exports = {
  createLegal,
  getLegalData,
  updateLegallData,
  createPdfAttachment,
  deletePdfAttachment,
  update,
};
