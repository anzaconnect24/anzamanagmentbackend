const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { createApplication, updateApplication, deleteApplication, getUserApplication, getAllApplications } = require('./application.controller');

const router = Router()
router.post("/",validateJWT,createApplication)
router.get('/user',validateJWT,getUserApplication)
router.get('/',validateJWT,getAllApplications)
router.patch('/:uuid',validateJWT,updateApplication)
router.delete('/:uuid',validateJWT,deleteApplication)

module.exports = router