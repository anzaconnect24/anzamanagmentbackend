"use strict";

const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const {
  upsertRating,
  getRatings,
  getAverageRatings,
  deleteRating,
} = require("./courseRatings.controllers");

const router = Router();

router.post("/", validateJWT, upsertRating);
router.get("/", validateJWT, getRatings);
router.get("/average", getAverageRatings);
router.delete("/:programUuid", validateJWT, deleteRating);

module.exports = router;
