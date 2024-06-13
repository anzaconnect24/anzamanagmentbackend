const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { createRole, updateRole, deleteRole, getUserRole, getAllRoles } = require('./role.controller');

const router = Router()
router.post("/",validateJWT,createRole)
router.get('/user',validateJWT,getUserRole)
router.get('/',validateJWT,getAllRoles)
router.patch('/:uuid',validateJWT,updateRole)
router.delete('/:uuid',validateJWT,deleteRole)

module.exports = router