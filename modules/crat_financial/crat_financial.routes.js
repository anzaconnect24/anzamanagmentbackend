const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const {
  createFinancial,
  getFinancialData,
  updateFinancialData,
  createPdfAttachment,
  deletePdfAttachment,
  update,
} = require("./crat_financial.controller");
const upload = require("../../utils/upload");

const router = Router();
router.post("/create", validateJWT, createFinancial);
router.get("/data", validateJWT, getFinancialData);
router.post("/update", validateJWT, updateFinancialData);
router.patch("/:uuid", validateJWT, update);
router.post(
  "/attachment",
  upload.single("file"),
  validateJWT,
  createPdfAttachment
);
router.post("/delete_attachment", validateJWT, deletePdfAttachment);
module.exports = router;
