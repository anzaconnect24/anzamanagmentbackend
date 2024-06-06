const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { createFavourite, updateFavourite, getFavourites, getFavourite } = require('./favourite.controller')

const router = Router()
router.post("/",validateJWT,createFavourite)
router.patch("/:uuid",validateJWT,updateFavourite)
router.get("/:uuid",validateJWT,getFavourite)
router.get("/",validateJWT,getFavourites)

module.exports = router