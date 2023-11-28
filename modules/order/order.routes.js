const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { createOrder, deleteOrderProduct, deleteOrder, getSpecificBusinessOrders, getCustomerOrders,updateOrderProduct } = require('./order.controller')

const router = Router()
router.post("/",validateJWT,createOrder)
router.get("/business/:uuid",validateJWT,getSpecificBusinessOrders)
router.get("/",validateJWT,getCustomerOrders)
router.delete('/orderProduct/:uuid',validateJWT,deleteOrderProduct)
router.delete('/:uuid',validateJWT,deleteOrder)
router.patch("/:uuid",validateJWT,updateOrderProduct)

module.exports = router