const { Router } = require("express");
const upload = require("../../utils/upload");
const { validateJWT } = require("../../utils/validateJWT");
const {
  createSuccessStory,
  updateSuccessStory,
  deleteSuccessStory,
  getAllSuccessStorys,
  getSuccessStoryDetails,
} = require("./success_story.controller");

const router = Router();
router.post("/", createSuccessStory);
router.get("/", validateJWT, getAllSuccessStorys);
router.get("/:uuid", validateJWT, getSuccessStoryDetails);
router.patch("/:uuid", validateJWT, updateSuccessStory);
router.delete("/:uuid", validateJWT, deleteSuccessStory);

module.exports = router;
