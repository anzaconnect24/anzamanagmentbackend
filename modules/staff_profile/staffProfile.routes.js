const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const {
  createStaffProfile,
  getStaffProfile,
  updateStaffProfile,
  deleteStaffProfile,
} = require("./staffProfile.controllers");

const router = Router();
router.post("/", createStaffProfile);
router.get("/:uuid", validateJWT, getStaffProfile);
router.patch("/:uuid", validateJWT, updateStaffProfile);
router.delete("/:uuid", validateJWT, deleteStaffProfile);

module.exports = router;
