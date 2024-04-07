const {Router} = require('express')
const router = Router()
const { validateJWT } = require("../../utils/validateJWT")
const { createNotification, addNotificationViewer, getUnreadNotifications } = require('./notification.controller');
router.post("/",createNotification)
router.post("/viewer/:uuid",validateJWT, addNotificationViewer)
router.get('/',validateJWT,getUnreadNotifications)



module.exports = router