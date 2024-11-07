const { Router } = require("express");
const router = Router();

const { validateJWT } = require("../../utils/validateJWT");
const {
  createMentorEntreprenuer,
  deleteMentorEntreprenuer,
  getMentorEntreprenuers,
} = require("./mentorEntreprenuer.controllers");

router.post("/", validateJWT, createMentorEntreprenuer);
router.get("/mentor/:uuid", validateJWT, getMentorEntreprenuers);
router.delete("/:uuid", validateJWT, deleteMentorEntreprenuer);

module.exports = router;
