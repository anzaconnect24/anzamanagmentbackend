const { errorResponse, successResponse } = require("../../utils/responses");
const getUrl = require("../../utils/cloudinary_upload");
const { BusinessTool } = require("../../models");

// Create a new business tool
const createBusinessTool = async (req, res) => {
  try {
    const { fileName, description, fileUrl, fileType, fileSize } = req.body;

    const response = await BusinessTool.create({
      fileName,
      description,
      fileUrl,
      fileType,
      fileSize,
    });

    successResponse(res, response);
  } catch (error) {
    console.error("Error creating business tool:", error);
    errorResponse(res, error);
  }
};

// Get all business tools
const getAllBusinessTools = async (req, res) => {
  try {
    const response = await BusinessTool.findAll({
      order: [["createdAt", "DESC"]],
    });

    successResponse(res, response);
  } catch (error) {
    console.error("Error fetching business tools:", error);
    errorResponse(res, error);
  }
};

// Get a single business tool by UUID
const getBusinessTool = async (req, res) => {
  try {
    const { uuid } = req.params;

    const response = await BusinessTool.findOne({
      where: { uuid },
    });

    if (!response) {
      return res.status(404).json({
        status: false,
        message: "Business tool not found",
      });
    }

    successResponse(res, response);
  } catch (error) {
    console.error("Error fetching business tool:", error);
    errorResponse(res, error);
  }
};

// Update a business tool
const updateBusinessTool = async (req, res) => {
  try {
    const { uuid } = req.params;
    const { fileName, description, fileUrl, fileType, fileSize } = req.body;

    const businessTool = await BusinessTool.findOne({
      where: { uuid },
    });

    if (!businessTool) {
      return res.status(404).json({
        status: false,
        message: "Business tool not found",
      });
    }

    const response = await businessTool.update({
      fileName,
      description,
      fileUrl,
      fileType,
      fileSize,
    });

    successResponse(res, response);
  } catch (error) {
    console.error("Error updating business tool:", error);
    errorResponse(res, error);
  }
};

// Delete a business tool
const deleteBusinessTool = async (req, res) => {
  try {
    const { uuid } = req.params;

    const businessTool = await BusinessTool.findOne({
      where: { uuid },
    });

    if (!businessTool) {
      return res.status(404).json({
        status: false,
        message: "Business tool not found",
      });
    }

    await businessTool.destroy();

    successResponse(res, { message: "Business tool deleted successfully" });
  } catch (error) {
    console.error("Error deleting business tool:", error);
    errorResponse(res, error);
  }
};

module.exports = {
  createBusinessTool,
  getAllBusinessTools,
  getBusinessTool,
  updateBusinessTool,
  deleteBusinessTool,
};
