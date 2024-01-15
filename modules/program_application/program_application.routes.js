const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const upload = require("../../utils/upload");
const { createProgramApplication, updateProgramApplication, deleteProgramApplication, getUserProgramApplication, getAllProgramApplications, getReviewersStatus,
getWaitingProgramApplications,getAcceptedProgramApplications,getRejectedProgramApplications,getProgramApplicationDetails,postProgramApplicationDocument } = require('./program_application.controller');

const router = Router()
router.post("/",validateJWT,createProgramApplication)
router.post("/document/:uuid",upload.single('file'),validateJWT,postProgramApplicationDocument)
router.get('/user/:uuid',validateJWT,getUserProgramApplication)
// business UUID
// ret reviewers,status()
router.get('/reviewers/:uuid',validateJWT,getReviewersStatus)
router.get('/',validateJWT,getAllProgramApplications)
router.get('/waiting',validateJWT,getWaitingProgramApplications)
router.get('/accepted',validateJWT,getAcceptedProgramApplications)
router.get('/rejected',validateJWT,getRejectedProgramApplications)
router.get('/:uuid',validateJWT,getProgramApplicationDetails)
router.patch('/:uuid',validateJWT,updateProgramApplication)
router.delete('/:uuid',validateJWT,deleteProgramApplication)
// router.delete('ProgramApplication_requirement/:uuid',validateJWT,deleteProgramApplicationRequirement)

module.exports = router