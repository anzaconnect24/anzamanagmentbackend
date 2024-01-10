const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { createProgram, updateProgram, deleteProgram, getUserProgram, getAllPrograms, getReviewersStatus } = require('./program.controller');

const router = Router()
router.post("/",createProgram)
router.get('/user',validateJWT,getUserProgram)
// business UUID
// ret reviewers,status()
router.get('/reviewers/:uuid',validateJWT,getReviewersStatus)
router.get('/',validateJWT,getAllPrograms)
router.patch('/:uuid',validateJWT,updateProgram)
router.delete('/:uuid',validateJWT,deleteProgram)

module.exports = router