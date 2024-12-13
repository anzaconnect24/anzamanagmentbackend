const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { createFinancial, getFinancialData, updateFinancialData, createPdfAttachment,deletePdfAttachment } = require('./crat_financial.controller');
const upload = require('../../utils/upload');

const router = Router()
router.post("/create",validateJWT,createFinancial)
router.get('/data',validateJWT,getFinancialData)
 router.post('/update',validateJWT,updateFinancialData)
 router.post("/attachment",upload.single('file'),validateJWT, createPdfAttachment)
 router.delete("/attachment", validateJWT, deletePdfAttachment);
module.exports = router