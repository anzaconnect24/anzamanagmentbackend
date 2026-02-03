const { Router } = require("express");
const router = Router();

const { validateJWT } = require("../../utils/validateJWT");
const {
  createMentorEntreprenuer,
  deleteMentorEntreprenuer,
  getMentorEntreprenuers,
  setupMentorEntreprenuerMeeting,
  getUnapprovedMentorEntreprenuers,
  updateMentorEntreprenuer,
  getEntreprenuerMentors,
  setupMeeting,
  acceptAppointment,
  rejectAppointment,
  completeMeeting,
} = require("./mentorEntreprenuer.controllers");

router.post("/", validateJWT, createMentorEntreprenuer);
router.get("/mentor/:uuid", validateJWT, getMentorEntreprenuers);
router.get("/entreprenuer/:uuid", validateJWT, getEntreprenuerMentors);
router.get("/unapproved/", validateJWT, getUnapprovedMentorEntreprenuers);
router.delete("/:uuid", validateJWT, deleteMentorEntreprenuer);
router.patch("/:uuid", validateJWT, updateMentorEntreprenuer);
router.post(
  "/:uuid/setup-meeting",
  validateJWT,
  setupMentorEntreprenuerMeeting,
);
router.post("/:uuid/accept-appointment", validateJWT, acceptAppointment);
router.post("/:uuid/reject-appointment", validateJWT, rejectAppointment);
router.post("/:uuid/complete-meeting", validateJWT, completeMeeting);

module.exports = router;
