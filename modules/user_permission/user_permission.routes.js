const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { createUserPermission, updateUserPermission, deleteUserPermission, getUserUserPermission, getAllUserPermissions } = require('./user_permission.controller');

const router = Router()
router.post("/",validateJWT,createUserPermission)
router.get('/user',validateJWT,getUserUserPermission)
router.get('/',validateJWT,getAllUserPermissions)
router.patch('/:uuid',validateJWT,updateUserPermission)
router.delete('/:uuid',validateJWT,deleteUserPermission)

module.exports = router