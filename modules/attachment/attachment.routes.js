const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { createAttachment, deleteAttachment } = require('./attachment.controller');
const upload = require('../../utils/upload');

const router = Router()
router.post("/:uuid",validateJWT,upload.single("file"),createAttachment)
router.delete('/:uuid',validateJWT,deleteAttachment)
module.exports = router