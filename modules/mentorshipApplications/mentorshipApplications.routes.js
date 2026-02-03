const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const {
  createMentorshipApplication,
  getMentorshipApplication,
  getAllMentorshipApplications,
  deleteMentorshipApplication,
  updateMentorshipApplication,
  getEntreprenuerMentorshipApplications,
  setupMeeting,
  acceptAppointment,
} = require("./mentorshipApplications.controllers");
const { getPagination } = require("../../utils/getPagination");

const router = Router();
router.post("/", validateJWT, createMentorshipApplication);
router.get("/:uuid", validateJWT, getMentorshipApplication);
router.get("/", validateJWT, getPagination, getAllMentorshipApplications);
router.get(
  "/entreprenuer/:uuid",
  validateJWT,
  getPagination,
  getEntreprenuerMentorshipApplications,
);
router.patch("/:uuid", validateJWT, updateMentorshipApplication);
router.delete("/:uuid", validateJWT, deleteMentorshipApplication);
router.post("/:uuid/setup-meeting", validateJWT, setupMeeting);
router.post("/:uuid/accept-appointment", validateJWT, acceptAppointment);

module.exports = router;
