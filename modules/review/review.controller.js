const { errorResponse, successResponse } = require("../../utils/responses")
const {Review, Product, User} = require("../../models");


const createReview = async(req,res)=>{
    try {
        var userId = null;
        const {
            rate,comment,name,email,user_uuid,product_uuid
        } = req.body;
        const product = await Product.findOne({
            where:{
                uuid:product_uuid
            }
        });
        if (user_uuid !== null && user_uuid !== "") {
            const user = await User.findOne({
                where:{
                    uuid:user_uuid
                }
            });   
            userId = user.id
            name = user.name
            email = user.email     
        }
        const response = await Review.create({
            rate,comment,name,email,userId,productId:product.id
        })
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}
    
const updateReview = async(req,res)=>{
    try {
        
        const uuid = req.params.uuid
        const review = await Review.findOne({
            where:{
                uuid
            }
        });
        const response = await review.update({...req.body})
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}
        
const getReviews = async(req,res)=>{
    try {
        const response = await Review.findAll({
            order: [
                ['createdAt', 'DESC']
            ]
        })
        const sum = await Review.sum("rate")
        const count = await Review.count({
        })
        successResponse(res,{response,"rate":(sum/count)})
    } catch (error) {
        errorResponse(res,error)
    }
}

const getReview = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const review = await Review.findOne({
            where:{
                uuid
            }
        });
        successResponse(res,review)
    } catch (error) {
        errorResponse(res,error)
    }
}

module.exports = {createReview, updateReview, getReviews, getReview}