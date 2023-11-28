const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { createBusinessSector, getBusinessSector, getAllBusinessSector, getBusinessSectorProducts, deleteSector } = require('./sector.controller')

const router = Router()
router.post("/",createBusinessSector) 
router.get("/:uuid",getBusinessSector) 
router.get("/",getAllBusinessSector)
router.get("/business/products/:uuid",getBusinessSectorProducts)
router.delete('/:uuid',validateJWT,deleteSector)

module.exports = router