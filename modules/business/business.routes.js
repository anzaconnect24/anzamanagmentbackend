const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { createBusiness, getCategories, updateBusiness, deleteBusiness, getUserBusiness, getAllBusiness, getSellersApplications } = require('./business.controller');

const router = Router()
router.post("/",validateJWT,createBusiness)
router.get('/user',validateJWT,getUserBusiness)
router.get('/',validateJWT,getAllBusiness)
router.get('/applications',validateJWT,getSellersApplications)
router.patch('/:uuid',validateJWT,updateBusiness)
router.delete('/:uuid',validateJWT,deleteBusiness)

module.exports = router