const { errorResponse, successResponse } = require("../../utils/responses")
const {Payment, Order, Product} = require("../../models");


const createPayment = async(req,res)=>{
    user = req.user
    try {
        const {
            order_uuid,amount,agent
        } = req.body;
        const order = await Order.findOne({
            where:{
                uuid:order_uuid
            }
        })
        const response = await Payment.create({
            userId:user.id,
            orderId:order_uuid,
            amount,
            agent,
        })
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const getAllPayments = async(req,res)=>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await Payment.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            order:['createdAt','DESC'],
            attributes:{
                exclude:["id"/*,"uuid","name","createdAt","updatedAt"*/]
            },
        })
        successResponse(res,{count, data:rows, page})
    } catch (error) {
        errorResponse(res,error)
    }
}

const getPayment = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const response = await Payment.findOne({
            where:{
                uuid
            },
            attributes:{
                exclude:["id"/*,"uuid","name","createdAt","updatedAt"*/]
            },
        })
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const updatePayment = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const payment = await Payment.findOne({
            where:{
                uuid
            }
        });
        const response = await payment.update({...req.body})
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const deletePayment = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const sector = await Payment.findOne({
            where:{
                uuid
            }
        });
        const response = await sector.destroy()
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

module.exports = {createPayment, getPayment, getAllPayments, deletePayment, updatePayment}