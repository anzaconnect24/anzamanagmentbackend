const { Router } = require("express");
const router = Router();

const { validateJWT } = require("../../utils/validateJWT");
const {
  createMentorReport,
  deleteMentorReport,
  getMentorReports,
  getEntreprenuerReports,
} = require("./mentorReports.controllers");
const upload = require("../../utils/upload");

router.post("/", upload.single("file"), validateJWT, createMentorReport);
router.get("/mentor/:uuid", validateJWT, getMentorReports);
router.get("/entreprenuer/:uuid", validateJWT, getEntreprenuerReports);
router.delete("/:uuid", validateJWT, deleteMentorReport);

module.exports = router;
