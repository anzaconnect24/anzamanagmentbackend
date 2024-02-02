const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const {createConversation, getUserConversations} = require("./conversation.controller")

const router = Router()
router.post("/",validateJWT,createConversation)
router.get('/',validateJWT,getUserConversations)

module.exports = router