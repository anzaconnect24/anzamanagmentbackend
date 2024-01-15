const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const upload = require("../../utils/upload");
const { createInvestorProfile, updateInvestorProfile, deleteInvestorProfile, getUserInvestorProfile, getAllInvestorProfiles, getReviewersStatus,
getWaitingInvestorProfiles,getAcceptedInvestorProfiles,getRejectedInvestorProfiles,getInvestorProfileDetails,postInvestorProfileDocument,
getMyProfileDetails,updateMyProfile } = require('./investor_profile.controller');

const router = Router()
router.post("/",validateJWT,createInvestorProfile)
router.post("/document/:uuid",upload.single('file'),validateJWT,postInvestorProfileDocument)
router.get('/user',validateJWT,getUserInvestorProfile)
// business UUID
// ret reviewers,status()
router.get('/reviewers/:uuid',validateJWT,getReviewersStatus)
router.get('/',validateJWT,getAllInvestorProfiles)
router.get('/waiting',validateJWT,getWaitingInvestorProfiles)
router.get('/accepted',validateJWT,getAcceptedInvestorProfiles)
router.get('/rejected',validateJWT,getRejectedInvestorProfiles)
router.get('/me',validateJWT,getMyProfileDetails)
router.get('/:uuid',validateJWT,getInvestorProfileDetails)
router.patch('/:uuid',validateJWT,updateInvestorProfile)
router.patch('/me',validateJWT,updateMyProfile)
router.delete('/:uuid',validateJWT,deleteInvestorProfile)
// router.delete('InvestorProfile_requirement/:uuid',validateJWT,deleteInvestorProfileRequirement)

module.exports = router