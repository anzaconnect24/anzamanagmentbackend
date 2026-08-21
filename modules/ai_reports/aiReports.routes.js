"use strict";

const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const {
  createReport,
  listReports,
  getReport,
  deleteReport,
  getReportStats,
} = require("./aiReports.controllers");

const router = Router();

router.post("/", validateJWT, createReport);
router.get("/", validateJWT, listReports);
router.get("/stats", validateJWT, getReportStats);
router.get("/:uuid", validateJWT, getReport);
router.delete("/:uuid", validateJWT, deleteReport);

module.exports = router;
