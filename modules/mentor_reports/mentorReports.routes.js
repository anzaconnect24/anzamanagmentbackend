const { Router } = require("express");
const router = Router();

const { validateJWT } = require("../../utils/validateJWT");
const {
  createMentorReport,
  deleteMentorReport,
  getMentorReports,
  getEntreprenuerReports,
  getMentorReport,
  getAllReports,
  getMentorEntrepreneurReports,
} = require("./mentorReports.controllers");
const upload = require("../../utils/upload");

router.post("/", upload.single("file"), validateJWT, createMentorReport);
router.get("/mentor/:uuid", validateJWT, getMentorReports);
router.get("/entreprenuer/:uuid", validateJWT, getEntreprenuerReports);
router.get(
  "/mentor/:mentorUuid/entrepreneur/:entrepreneurUuid",
  validateJWT,
  getMentorEntrepreneurReports,
);
router.get("/:uuid", validateJWT, getMentorReport);
router.get("/", validateJWT, getAllReports);
router.delete("/:uuid", validateJWT, deleteMentorReport);

module.exports = router;
