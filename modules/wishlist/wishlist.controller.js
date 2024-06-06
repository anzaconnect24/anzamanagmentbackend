const { errorResponse, successResponse } = require("../../utils/responses")
const {User,Wishlist,Product,ProductImage} = require("../../models");

const createWishlist = async(req,res)=>{
    try {
       
        const uuid = req.params.uuid;
        const user = req.user;
        const product = await Product.findOne({
            where:{
                uuid
            }
        })
        const wishlist = await Wishlist.create({
            userId:user.id,
            productId:product.id
        })
        
        successResponse(res,wishlist)
    } catch (error) {
        errorResponse(res,error)
    }
}



    const deleteWishlist = async(req,res)=>{
        try {
            const uuid = req.params.uuid
            const wishlist = await Wishlist.findOne({
                where:{
                    uuid
                }
            });
            const response = await wishlist.destroy()
            successResponse(res,response)
        } catch (error) {
            errorResponse(res,error)
        }
    }


    const isInWishlist = async(req,res)=>{
        try {
            const uuid = req.params.uuid
            const user = req.user
            const product = await Product.findOne({
                where:{
                    uuid
                }
            });
            const response = await Wishlist.count({
                where:{
                    productId: product.id,
                    userId: user.id,
                }
            })
            successResponse(res,{isAdded:response>0?true:false})
        } catch (error) {
            errorResponse(res,error)
        }
    }

    const myWishlist = async(req,res)=>{
        try {
            const user = req.user
            const response = await Wishlist.findAll({
                where:{
                    userId: user.id,
                },
                include:[{
                    model:Product,
                    include: [ProductImage]
                }]
            })
            successResponse(res,response)
        } catch (error) {
            errorResponse(res,error)
        }
    }

module.exports = {
    createWishlist,deleteWishlist,isInWishlist,myWishlist
}