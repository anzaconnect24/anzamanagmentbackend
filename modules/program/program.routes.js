const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { createProgram, updateProgram, deleteProgram, getUserProgram, getAllPrograms, getReviewersStatus,
getBfaPrograms,getIraPrograms,getProgramDetails,deleteProgramRequirement } = require('./program.controller');

const router = Router()
router.post("/",createProgram)
router.get('/user',validateJWT,getUserProgram)
// business UUID
// ret reviewers,status()
router.get('/reviewers/:uuid',validateJWT,getReviewersStatus)
router.get('/',validateJWT,getAllPrograms)
router.get('/bfa',validateJWT,getBfaPrograms)
router.get('/ira',validateJWT,getIraPrograms)
router.get('/:uuid',validateJWT,getProgramDetails)
router.patch('/:uuid',validateJWT,updateProgram)
router.delete('/:uuid',validateJWT,deleteProgram)
router.delete('program_requirement/:uuid',validateJWT,deleteProgramRequirement)

module.exports = router