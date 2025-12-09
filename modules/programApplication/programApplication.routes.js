const express = require("express");
const router = express.Router();
const {
  createProgramApplication,
  getAllProgramApplications,
  getProgramApplicationByUuid,
  updateProgramApplication,
  deleteProgramApplication,
} = require("./programApplication.controller");
const { validateJWT } = require("../../utils/validateJWT");

// Public routes (anyone can view)
router.get("/", getAllProgramApplications);
router.get("/:uuid", getProgramApplicationByUuid);

// Protected routes (require authentication)
router.post("/", validateJWT, createProgramApplication);
router.put("/:uuid", validateJWT, updateProgramApplication);
router.delete("/:uuid", validateJWT, deleteProgramApplication);

module.exports = router;
