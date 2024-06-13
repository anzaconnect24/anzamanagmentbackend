const { errorResponse, successResponse } = require("../../utils/responses")
const {Favourite, Product, User} = require("../../models");


const createFavourite = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const {
            product_uuid
        } = req.body;
        const product = await Product.findOne({
            where:{
                uuid:product_uuid
            }
        });
        const user = req.user 
        const response = await Favourite.create({
            userId:user.id,productId:product.id
        })
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}
    
const updateFavourite = async(req,res)=>{
    try {
        
        const uuid = req.params.uuid
        const favourite = await Favourite.findOne({
            where:{
                uuid
            }
        });
        const response = await favourite.update({...req.body})
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}
        
const getFavourites = async(req,res)=>{
    try {
        const response = await Favourite.findAll({
            include: [
                User,
                Product
            ]
        })
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const getFavourite = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const favourite = await Favourite.findOne({
            where:{
                uuid
            },
            include: [
                User,
                Product
            ]
        });
        successResponse(res,favourite)
    } catch (error) {
        errorResponse(res,error)
    }
}

module.exports = {createFavourite, updateFavourite, getFavourites, getFavourite}