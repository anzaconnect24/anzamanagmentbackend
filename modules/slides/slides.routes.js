const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const {
  createSlide,
  updateSlide,
  deleteSlide,

  getSlides,
  markRead,
} = require("./slides.controller");
const { getPagination } = require("../../utils/getPagination");
const { requireRoles } = require("../../utils/authorization");

// Course content is authored by staff. Learners read it but must not be able
// to write to it — these routes were previously open to any signed-in user.
const AUTHORS = ["Admin", "Staff", "Reviewer"];

const router = Router();
router.post("/", validateJWT, requireRoles(AUTHORS), createSlide);
router.post("/mark-read", validateJWT, markRead);
router.get("/", validateJWT, getPagination, getSlides);
router.patch("/:uuid", validateJWT, requireRoles(AUTHORS), updateSlide);
router.delete("/:uuid", validateJWT, requireRoles(AUTHORS), deleteSlide);

module.exports = router;
