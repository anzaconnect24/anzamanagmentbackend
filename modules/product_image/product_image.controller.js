const { errorResponse, successResponse } = require("../../utils/responses")
const {ProductImage,Product} = require("../../models");
const getUrl = require("../../utils/cloudinary_upload");



const createProductImage = async(req,res)=>{
try {
    const uuid = req.params.uuid;
    let image = await getUrl(req);
    const product = await Product.findOne({
        where:{
            uuid
        }
    })
    
    const response = await ProductImage.create({
        image,
        productId:product.id
    })
    successResponse(res,response)
} catch (error) {
    errorResponse(res,error)
}
}


    const deleteProductImage = async(req,res)=>{
        try {
           
            const uuid = req.params.uuid
            const productImage = await ProductImage.findOne({
                where:{
                    uuid
                }
            });
            const response = await productImage.destroy()
            successResponse(res,response)
        } catch (error) {
            errorResponse(res,error)
        }
    }
    


module.exports = {
    createProductImage,deleteProductImage
}