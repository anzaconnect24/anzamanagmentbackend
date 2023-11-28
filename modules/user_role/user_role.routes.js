const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { createUserRole, updateUserRole, deleteUserRole, getUserUserRole, getAllUserRoles } = require('./user_role.controller');

const router = Router()
router.post("/",validateJWT,createUserRole)
router.get('/user',validateJWT,getUserUserRole)
router.get('/',validateJWT,getAllUserRoles)
router.patch('/:uuid',validateJWT,updateUserRole)
router.delete('/:uuid',validateJWT,deleteUserRole)

module.exports = router