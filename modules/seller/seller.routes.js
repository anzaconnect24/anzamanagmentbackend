const {Router} = require("express")
const { validateJWT } = require("../../utils/validateJWT")
const router = Router()
const upload = require("../../utils/upload");
const {getCounts } = require("./seller.controller");

router.get("/counts",validateJWT,getCounts)

module.exports = router