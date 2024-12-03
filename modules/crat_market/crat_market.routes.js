const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { createMarket, getMarketData, updateMarketData, createPdfAttachment,deletePdfAttachment } = require('./crat_market.controller');
const upload = require('../../utils/upload');

const router = Router()
router.post("/create",validateJWT,createMarket)
router.get('/data',validateJWT,getMarketData)
 router.post('/update',validateJWT,updateMarketData)
 router.post("/attachment",upload.single('file'), createPdfAttachment)
 router.delete("/attachment", validateJWT, deletePdfAttachment); // Add this route
module.exports = router