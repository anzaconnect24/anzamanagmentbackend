const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { createProgram, updateProgram, deleteProgram, getUserProgram, getAllPrograms, getReviewersStatus,
getBfaPrograms,getIraPrograms,getProgramDetails,deleteProgramRequirement, 
addProgramRequirements,
getConsultancePrograms} = require('./program.controller');

const router = Router()
router.post("/",validateJWT,createProgram)
router.get('/user',validateJWT,getUserProgram)
// business UUID
// ret reviewers,status()
router.get('/reviewers/:uuid',validateJWT,getReviewersStatus)
router.get('/',validateJWT,getAllPrograms)
router.get('/bfa',validateJWT,getBfaPrograms)
router.get('/ira',validateJWT,getIraPrograms)
router.get('/consultance',validateJWT,getConsultancePrograms)

router.get('/consultance',validateJWT,getIraPrograms)

router.get('/:uuid',validateJWT,getProgramDetails)
router.patch('/:uuid',validateJWT,updateProgram)
router.delete('/:uuid',validateJWT,deleteProgram)
router.delete('/program_requirement/:uuid',validateJWT,deleteProgramRequirement)
router.post('/program_requirement/:uuid',validateJWT,addProgramRequirements)


module.exports = router