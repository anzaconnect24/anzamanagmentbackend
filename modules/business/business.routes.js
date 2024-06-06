const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { createBusiness, getCategories, updateBusiness, deleteBusiness, getUserBusiness, getAllBusiness, getSellersApplications, 
getApprovedBusiness, getWaitingBusinesses, getApprovedBusinesses, getRejectedBusinesses, findBusiness, getInvestorBusinesses } = require('./business.controller');
const upload = require("../../utils/upload");

const router = Router()
router.post("/",validateJWT,createBusiness)
router.get('/user',validateJWT,getUserBusiness)
router.get('/waiting',validateJWT, getWaitingBusinesses)
router.get('/approved',validateJWT, getApprovedBusinesses)
router.get('/investor',validateJWT, getInvestorBusinesses)
router.get('/rejected',validateJWT, getRejectedBusinesses)
router.get('/',validateJWT,getAllBusiness)
router.get('/:uuid',validateJWT,findBusiness)
router.patch('/file/:uuid',upload.single("file"), validateJWT,updateBusiness)
router.patch('/:uuid',validateJWT,updateBusiness)

router.delete('/:uuid',validateJWT,deleteBusiness)
module.exports = router