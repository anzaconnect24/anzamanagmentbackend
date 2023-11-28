const { errorResponse, successResponse } = require("../../utils/responses")
const {BusinessCategory,Business,User,Order,OrderProduct,Product,ProductImage} = require("../../models");
const { sendEmail } = require("../../utils/send_email");



const createOrder = async(req,res)=>{
    try {
        const {
            products
        } = req.body;
        
        const user = req.user
        const order = await Order.create({
            userId:user.id
        })
    
        for (let index = 0; index < products.length; index++) {
            const item = products[index];
            await OrderProduct.create({
                orderId:order.id,
                productId:item.id,
                quantity:item.quantity
            })
        }

        // const response = await Payment.create({
        //     userId:user.id,
        //     orderId:order.id,
        //     amount,
        //     agent,
        // })

        sendEmail(req, res, user, 'order')
        successResponse(res,order)
    } catch (error) {
        errorResponse(res,error)
    }
}


const getCustomerOrders = async(req,res)=>{
    try {
        const user = req.user
        const response = await Order.findAll({
            order:[['createdAt', 'DESC']],
            where:{
                userId:user.id,
            },
            include:[{
                model:OrderProduct,
                include:[{
                    model:Product,
                    include:[ProductImage]
                }]
            }]
        });
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const getSpecificBusinessOrders = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const business = await Business.findOne({
            where:{
                uuid
            }
        });
        const response = await Order.findAll({
            include:[
                User,
                {
                    model:OrderProduct,
                    required:true,
                    include:{
                        model:Product,
                        required: true,
                        include:[ProductImage],
                        where:{
                            businessId:business.id
                        },
                        
                    }
                }
        
            ]
        });
        
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}
    
const deleteOrderProduct = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const orderProduct = await OrderProduct.findOne({
            where:{
                uuid
            }
        });
        const response = await orderProduct.destroy()
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const deleteOrder = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const order = await Order.findOne({
            where:{
                uuid
            }
        });
        const response = await order.destroy()
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const updateOrderProduct = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const orderProduct = await OrderProduct.findOne({
            where:{
                uuid
            }
        });
        const response = await orderProduct.update({...req.body})
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

module.exports = {
    createOrder,deleteOrderProduct,deleteOrder,getCustomerOrders,getSpecificBusinessOrders,updateOrderProduct
}