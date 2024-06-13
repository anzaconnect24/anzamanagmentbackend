const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const {createConversation, getUserConversations, deleteConversation} = require("./conversation.controller")

const router = Router()
router.post("/",validateJWT,createConversation)
router.get('/',validateJWT,getUserConversations)
router.delete('/:uuid',validateJWT,deleteConversation)

module.exports = router