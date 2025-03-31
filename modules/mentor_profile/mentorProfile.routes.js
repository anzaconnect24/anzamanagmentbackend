const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const {
  createMentorProfile,
  getMentorProfile,
  updateMentorProfile,
  deleteMentorProfile,
} = require("./mentorProfile.controllers");

const router = Router();
router.post("/", createMentorProfile);
router.get("/:uuid", validateJWT, getMentorProfile);
router.patch("/:uuid", validateJWT, updateMentorProfile);
router.delete("/:uuid", validateJWT, deleteMentorProfile);

module.exports = router;
