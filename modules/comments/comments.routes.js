const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const {
  createComment,
  updateComment,
  deleteComment,
  getComments,
} = require("./comments.controller");
const { getPagination } = require("../../utils/getPagination");

const router = Router();
router.post("/", validateJWT, createComment);
router.get("/", validateJWT, getPagination, getComments);
router.patch("/:uuid", validateJWT, updateComment);
router.delete("/:uuid", validateJWT, deleteComment);

module.exports = router;
