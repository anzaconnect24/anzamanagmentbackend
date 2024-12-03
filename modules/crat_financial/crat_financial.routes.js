const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { createFinancial, getFinancialData, updateFinancialData, createPdfAttachment,deletePdfAttachment } = require('./crat_financial.controller');
const upload = require('../../utils/upload');

const router = Router()
router.post("/create",validateJWT,createFinancial)
router.get('/data',validateJWT,getFinancialData)
 router.post('/update',validateJWT,updateFinancialData)
 router.post("/attachment",upload.single('file'), createPdfAttachment)
 router.delete("/attachment", validateJWT, deletePdfAttachment); // Add this route
module.exports = router