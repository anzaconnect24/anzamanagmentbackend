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

const router = Router();
router.post("/", validateJWT, createSlide);
router.post("/mark-read", validateJWT, markRead);
router.get("/", validateJWT, getPagination, getSlides);
router.patch("/:uuid", validateJWT, updateSlide);
router.delete("/:uuid", validateJWT, deleteSlide);

module.exports = router;
