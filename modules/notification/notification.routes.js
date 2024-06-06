const {Router} = require('express')
const router = Router()
const { validateJWT } = require("../../utils/validateJWT")
const { createNotification, addNotificationViewer, getUnreadNotifications, getAllNotifications, deleteNotification } = require('./notification.controller');
router.post("/",createNotification)
router.post("/viewer/:uuid",validateJWT, addNotificationViewer)
router.get('/',validateJWT,getUnreadNotifications)
router.get('/all',validateJWT,getAllNotifications)
router.delete('/:uuid',validateJWT,deleteNotification)





module.exports = router