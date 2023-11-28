const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { createPayment, getPayment, getAllPayments, deletePayment, updatePayment } = require('./payment.controller')

const router = Router()
router.post("/",validateJWT,createPayment) 
router.get("/:uuid",validateJWT,getPayment) 
router.get("/",validateJWT,getAllPayments)
router.patch("/:uuid",validateJWT,updatePayment)
router.delete('/:uuid',validateJWT,deletePayment)

module.exports = router