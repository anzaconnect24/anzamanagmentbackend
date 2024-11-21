const { Router } = require("express");
const router = Router();

const { validateJWT } = require("../../utils/validateJWT");
const {
  createMentorEntreprenuer,
  deleteMentorEntreprenuer,
  getMentorEntreprenuers,
  getUnapprovedMentorEntreprenuers,
  updateMentorEntreprenuer,
  getEntreprenuerMentors,
} = require("./mentorEntreprenuer.controllers");

router.post("/", validateJWT, createMentorEntreprenuer);
router.get("/mentor/:uuid", validateJWT, getMentorEntreprenuers);
router.get("/entreprenuer/:uuid", validateJWT, getEntreprenuerMentors);
router.get("/unapproved/", validateJWT, getUnapprovedMentorEntreprenuers);
router.delete("/:uuid", validateJWT, deleteMentorEntreprenuer);
router.patch("/:uuid", validateJWT, updateMentorEntreprenuer);

module.exports = router;
