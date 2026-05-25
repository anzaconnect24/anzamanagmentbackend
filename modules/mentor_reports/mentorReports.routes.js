const { Router } = require("express");
const router = Router();

const { validateJWT } = require("../../utils/validateJWT");
const {
  requireRoles,
  requireSelfOrRoles,
} = require("../../utils/authorization");
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

router.post(
  "/",
  upload.single("file"),
  validateJWT,
  requireRoles(["Mentor", "Admin"]),
  createMentorReport,
);
router.get(
  "/mentor/:uuid",
  validateJWT,
  requireSelfOrRoles("uuid", ["Admin"]),
  getMentorReports,
);
router.get(
  "/entreprenuer/:uuid",
  validateJWT,
  requireSelfOrRoles("uuid", ["Admin"]),
  getEntreprenuerReports,
);
router.get(
  "/mentor/:mentorUuid/entrepreneur/:entrepreneurUuid",
  validateJWT,
  requireRoles(["Mentor", "Admin"]),
  getMentorEntrepreneurReports,
);
router.get("/:uuid", validateJWT, getMentorReport);
router.get("/", validateJWT, requireRoles(["Admin"]), getAllReports);
router.delete(
  "/:uuid",
  validateJWT,
  requireRoles(["Admin"]),
  deleteMentorReport,
);

module.exports = router;
