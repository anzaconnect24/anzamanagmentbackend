const { Router } = require("express");
const router = Router();

const { validateJWT } = require("../../utils/validateJWT");
const {
  requireRoles,
  requireSelfOrRoles,
} = require("../../utils/authorization");
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

router.post(
  "/",
  validateJWT,
  requireRoles(["Admin", "Finance"]),
  createMentorEntreprenuer,
);
router.get(
  "/mentor/:uuid",
  validateJWT,
  requireSelfOrRoles("uuid", ["Admin", "Finance"]),
  getMentorEntreprenuers,
);
router.get(
  "/entreprenuer/:uuid",
  validateJWT,
  requireSelfOrRoles("uuid", ["Admin", "Finance"]),
  getEntreprenuerMentors,
);
router.get(
  "/unapproved/",
  validateJWT,
  requireRoles(["Mentor", "Admin"]),
  getUnapprovedMentorEntreprenuers,
);
router.delete(
  "/:uuid",
  validateJWT,
  requireRoles(["Admin", "Finance"]),
  deleteMentorEntreprenuer,
);
router.patch(
  "/:uuid",
  validateJWT,
  requireRoles(["Admin", "Finance"]),
  updateMentorEntreprenuer,
);
router.post(
  "/:uuid/setup-meeting",
  validateJWT,
  requireRoles(["Mentor", "Admin"]),
  setupMentorEntreprenuerMeeting,
);
router.post(
  "/:uuid/accept-appointment",
  validateJWT,
  requireRoles(["Enterprenuer", "Admin"]),
  acceptAppointment,
);
router.post(
  "/:uuid/reject-appointment",
  validateJWT,
  requireRoles(["Enterprenuer", "Admin"]),
  rejectAppointment,
);
router.post(
  "/:uuid/complete-meeting",
  validateJWT,
  requireRoles(["Mentor", "Admin"]),
  completeMeeting,
);

module.exports = router;
