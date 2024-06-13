const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const {getMessages, createMessage} = require("./message.controller")

const router = Router()
router.post("/",validateJWT,createMessage)
router.get('/:uuid',validateJWT,getMessages)

module.exports = router