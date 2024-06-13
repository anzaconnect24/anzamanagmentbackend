const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { createPermission, updatePermission, deletePermission, getUserPermission, getAllPermissions } = require('./permission.controller');

const router = Router()
router.post("/",validateJWT,createPermission)
router.get('/user',validateJWT,getUserPermission)
router.get('/',validateJWT,getAllPermissions)
router.patch('/:uuid',validateJWT,updatePermission)
router.delete('/:uuid',validateJWT,deletePermission)

module.exports = router