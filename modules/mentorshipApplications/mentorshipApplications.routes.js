const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const {
  createMentorshipApplication,
  getMentorshipApplication,
  getAllMentorshipApplications,
  deleteMentorshipApplication,
  updateMentorshipApplication,
} = require("./mentorshipApplications.controllers");
const { getPagination } = require("../../utils/getPagination");

const router = Router();
router.post("/", validateJWT, createMentorshipApplication);
router.get("/:uuid", validateJWT, getMentorshipApplication);
router.get("/", validateJWT, getPagination, getAllMentorshipApplications);
router.patch("/:uuid", validateJWT, updateMentorshipApplication);
router.delete("/:uuid", validateJWT, deleteMentorshipApplication);

module.exports = router;
