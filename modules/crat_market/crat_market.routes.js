const { Router } = require("express");
const { validateJWT } = require("../../utils/validateJWT");
const {
  createMarket,
  getMarketData,
  updateMarketData,
  createPdfAttachment,
  deletePdfAttachment,
  update,
} = require("./crat_market.controller");
const upload = require("../../utils/upload");

const router = Router();
router.post("/create", validateJWT, createMarket);
// Prefer sending { uuid } in body for attachment operations. SubDomain supported for legacy calls.
router.post(
  "/attachment",
  upload.single("file"),
  validateJWT,
  createPdfAttachment
);
router.get("/data", validateJWT, getMarketData);
router.post("/update", validateJWT, updateMarketData);
router.patch("/:uuid", validateJWT, update);

router.post("/delete_attachment", validateJWT, deletePdfAttachment); // Add this route
module.exports = router;
