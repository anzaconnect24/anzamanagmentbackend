const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { createProductImage, deleteProductImage } = require('./product_image.controller');
const upload = require('../../utils/upload');

const router = Router()
router.post("/:uuid",validateJWT,upload.single("file"),createProductImage)
router.delete('/:uuid',validateJWT,deleteProductImage)
module.exports = router