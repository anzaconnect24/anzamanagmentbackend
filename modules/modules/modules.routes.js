const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const {
  createModule,
  updateModule,
  deleteModule,
  getModules,
  getModule,
} = require("./modules.controller");
const { getPagination } = require("../../utils/getPagination");

const router = Router();
router.post("/", validateJWT, createModule);
router.get("/", validateJWT, getPagination, getModules);
router.get("/:uuid", validateJWT, getPagination, getModule);
router.patch("/:uuid", validateJWT, updateModule);
router.delete("/:uuid", validateJWT, deleteModule);

module.exports = router;
