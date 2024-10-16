const { Router } = require("express");
const router = Router();

const { validateJWT } = require("../../utils/validateJWT");
const {
  createMentorEntreprenuer,
  deleteMentorEntreprenuer,
} = require("./mentorEntreprenuer.controllers");

router.post("/", validateJWT, createMentorEntreprenuer);
router.delete("/:uuid", validateJWT, deleteMentorEntreprenuer);

module.exports = router;
