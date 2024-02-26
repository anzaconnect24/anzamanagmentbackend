const {Router} = require('express')
const router = Router()

const { validateJWT } = require("../../utils/validateJWT")
const { createLog, updateLog, deleteLog, getUserLog, getAllLogs,getLogDetails, } = require('./log.controller');

router.post("/",validateJWT,createLog)
router.get('/user',validateJWT,getUserLog)
router.get('/',validateJWT,getAllLogs)
router.get('/:uuid',validateJWT,getLogDetails)
router.patch('/:uuid',validateJWT,updateLog)
router.delete('/:uuid',validateJWT,deleteLog)


module.exports = router