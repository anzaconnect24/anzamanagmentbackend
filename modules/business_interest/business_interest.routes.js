const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { createBusinessInterest, updateBusinessInterest, deleteBusinessInterest, getUserBusinessInterest, getAllBusinessInterests,
getBusinessInterestDetails, } = require('./business_interest.controller');

const router = Router()
router.post("/",validateJWT,createBusinessInterest)
router.get('/user',validateJWT,getUserBusinessInterest)
// business UUID
// ret reviewers,status()
router.get('/',validateJWT,getAllBusinessInterests)
router.get('/:uuid',validateJWT,getBusinessInterestDetails)
router.patch('/:uuid',validateJWT,updateBusinessInterest)
router.delete('/:uuid',validateJWT,deleteBusinessInterest)


module.exports = router