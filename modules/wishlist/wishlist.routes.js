const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { createWishlist, deleteWishlist, isInWishlist, myWishlist } = require('./wishlist.controller')

const router = Router()
router.post("/:uuid",validateJWT,createWishlist)
router.delete('/:uuid',validateJWT,deleteWishlist)
router.get('/product/:uuid',validateJWT,isInWishlist)//pass product uuid
router.get('/',validateJWT,myWishlist)//pass user uuid

module.exports = router