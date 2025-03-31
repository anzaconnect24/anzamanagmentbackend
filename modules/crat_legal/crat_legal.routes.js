const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { createLegal, getLegalData, updateLegallData, createPdfAttachment,deletePdfAttachment } = require('./crat_legal.controller');
const upload = require('../../utils/upload');

const router = Router()
router.post("/create",validateJWT,createLegal)
router.get('/data',validateJWT,getLegalData)
 router.post('/update',validateJWT,updateLegallData)
 router.post("/attachment",upload.single('file'),validateJWT, createPdfAttachment)
 router.post("/delete_attachment", validateJWT, deletePdfAttachment); // Add this route
module.exports = router