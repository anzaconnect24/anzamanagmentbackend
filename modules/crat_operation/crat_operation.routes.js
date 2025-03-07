const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { createOperation, getOperationData, updateOperationData, createPdfAttachment,deletePdfAttachment } = require('./crat_operation.controller');
const upload = require('../../utils/upload');

const router = Router()
router.post("/create",validateJWT,createOperation)
router.get('/data',validateJWT,getOperationData)
 router.post('/update',validateJWT,updateOperationData)
 router.post("/attachment",upload.single('file'), validateJWT, createPdfAttachment)
 router.delete("/delete_attachment", validateJWT, deletePdfAttachment); // Add this route
module.exports = router