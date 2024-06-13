const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { /*createPromotion,*/ broadcastPromotion} = require('./promotion.controller')

const router = Router()
// router.post("/:uuid",createPromotion)
router.get("/:role",validateJWT,broadcastPromotion)
module.exports = router