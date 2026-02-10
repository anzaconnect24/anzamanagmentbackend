const router = require("express").Router();
const { validateJWT } = require("../../utils/validateJWT");
const {
  createBusinessTool,
  getAllBusinessTools,
  getBusinessTool,
  updateBusinessTool,
  deleteBusinessTool,
} = require("./business_tools.controller");

// Get all business tools
router.get("/", validateJWT, getAllBusinessTools);

// Get single business tool
router.get("/:uuid", validateJWT, getBusinessTool);

// Create business tool (Admin only)
router.post("/", validateJWT, createBusinessTool);

// Update business tool (Admin only)
router.put("/:uuid", validateJWT, updateBusinessTool);

// Delete business tool (Admin only)
router.delete("/:uuid", validateJWT, deleteBusinessTool);

module.exports = router;
