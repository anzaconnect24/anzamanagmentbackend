const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const upload = require("../../utils/upload");
const { createBusinessDocument, deleteBusinessDocument } = require('./business_document.controller');

const router = Router()
router.post("/",upload.single('file'),createBusinessDocument)
router.delete('/:uuid',validateJWT,deleteBusinessDocument)


module.exports = router