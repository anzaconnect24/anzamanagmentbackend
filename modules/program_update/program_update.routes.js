const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const upload = require("../../utils/upload");
const { createProgramUpdate, updateProgramUpdate, deleteProgramUpdate, getUserProgramUpdate, getAllProgramUpdates, getReviewersStatus,
getWaitingProgramUpdates,getAcceptedProgramUpdates,getRejectedProgramUpdates,getProgramUpdateDetails,postProgramUpdateDocument } = require('./program_update.controller');

const router = Router()
router.post("/",upload.single('file'),validateJWT,createProgramUpdate)
router.post("/document/:uuid",upload.single('file'),validateJWT,postProgramUpdateDocument)
router.get('/user',validateJWT,getUserProgramUpdate)
// business UUID
// ret reviewers,status()
router.get('/reviewers/:uuid',validateJWT,getReviewersStatus)
router.get('/',validateJWT,getAllProgramUpdates)
router.get('/waiting',validateJWT,getWaitingProgramUpdates)
router.get('/accepted',validateJWT,getAcceptedProgramUpdates)
router.get('/rejected',validateJWT,getRejectedProgramUpdates)
router.get('/:uuid',validateJWT,getProgramUpdateDetails)
router.patch('/:uuid',validateJWT,updateProgramUpdate)
router.delete('/:uuid',validateJWT,deleteProgramUpdate)
// router.delete('ProgramUpdate_requirement/:uuid',validateJWT,deleteProgramUpdateRequirement)

module.exports = router