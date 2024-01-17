const { errorResponse, successResponse } = require("../../utils/responses")
const {Product,Business,Pledge,ProductImage,BusinessSector,Review, Sequelize, OrderProduct} = require("../../models");
const getUrl = require("../../utils/cloudinary_upload");

const {Op} = require('sequelize');


const createProduct = async(req,res)=>{
    try {
        const {
            name,buyingPrice,sellingPrice,amount,description,isFeatured
        } = req.body;
        const uuid = req.params.uuid
        const business = await Business.findOne({
            where:{
                uuid
            }
        });
        const response = await Product.create({
            name,buyingPrice,sellingPrice,amount,isFeatured,description,businessId:business.id
        })
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const updateProduct = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const product = await Product.findOne({
            where:{
                uuid
            }
        });
        const response = await product.update({...req.body})
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}
    
const getProducts = async(req,res)=>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit
        
        // const response = await Product.findAll({
        const {count, rows} = await Product.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            order:['createdAt','DESC'],
            distinct:true,
            include:{
                model:ProductImage,
                required: true,
                order: [
                    ['createdAt', 'ASC']
                ],
            },
            attributes:{
                exclude:["BusinessId"],
                include: [
                    [
                        Sequelize.literal(`(
                            SELECT AVG(rate)
                            FROM Reviews AS review
                            WHERE
                                productId = Product.id
                        )`),
                        'rating'
                    ],
                    [
                        Sequelize.literal(`(
                            SELECT count(*)
                            FROM Reviews AS review
                            WHERE
                                productId = Product.id
                        )`),
                        'ratingCount'
                    ]
                ],
            }
        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res,error)
    }
}

const getProduct = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        // res.status(200).send({"productId":current_product})
        const product = await Product.findOne({
            where:{
                uuid
            },
            attributes:{
                exclude:["BusinessId"], 
                include: [
                    [
                        Sequelize.literal(`(
                            SELECT AVG(rate)
                            FROM Reviews AS review
                            WHERE
                                productId = Product.id
                        )`),
                        'rating'
                    ],
                    [
                        Sequelize.literal(`(
                            SELECT count(*)
                            FROM Reviews AS review
                            WHERE
                                productId = Product.id
                        )`),
                        'ratingCount'
                    ]
                ],
            },
            include:[
                Review,ProductImage
            ]
        });
        successResponse(res,product)
    } catch (error) {
        errorResponse(res,error)
    }
}

const BusinessProducts = async(req,res)=>{
    try {
         const uuid = req.params.uuid
         const business = await Business.findOne({
            where:{
                uuid
            }
         })
         let {page,limit} = req.query
         page = parseInt(page)
         limit = parseInt(limit)
         const offset = (page-1)*limit
         
         // const response = await Product.findAll({
         const {count, rows} = await Product.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            order:['createdAt','DESC'],
            distinct:true,
            include:{
                model:ProductImage,
                required: true,
                order: [
                    ['createdAt', 'ASC']
                ],
            },
            where:{
                BusinessId:business.id
            },
            attributes:{
                exclude:["BusinessId"],
                include: [
                    [
                        Sequelize.literal(`(
                            SELECT AVG(rate)
                            FROM Reviews AS review
                            WHERE
                                productId = Product.id
                        )`),
                        'rating'
                    ],
                    [
                        Sequelize.literal(`(
                            SELECT count(*)
                            FROM Reviews AS review
                            WHERE
                                productId = Product.id
                        )`),
                        'ratingCount'
                    ]
                ],
            }
         })
         const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
         successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res,error)
    }
}

const getFeaturedProducts = async(req,res)=>{
    try {
        let {page,limit} = req.query
        if (page!=null) {
            page = parseInt(page)
            limit = parseInt(limit)
            const offset = (page-1)*limit      

            const {count, rows} = await Product.findAndCountAll({
                offset: offset, //ruka ngapi
                limit: limit, //leta ngapi
                order:['createdAt','DESC'],
                distinct:true,
                where:{
                    isFeatured:true
                },
                include: {
                    model:ProductImage,
                    required: true,
                    order: [
                        ['createdAt', 'ASC']
                    ],
                },
                attributes:{
                    exclude: ["BusinessId"],
                    include: [
                        [
                            Sequelize.literal(`(
                                SELECT AVG(rate)
                                FROM Reviews AS review
                                WHERE
                                    productId = Product.id
                            )`),
                            'rating'
                        ],
                        [
                            Sequelize.literal(`(
                                SELECT count(*)
                                FROM Reviews AS review
                                WHERE
                                    productId = Product.id
                            )`),
                            'ratingCount'
                        ]
                    ],
                }
            });

            const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
            successResponse(res, {count, data:rows, page, totalPages})      
        }else{
            const product = await Product.findAll({
                limit: 12,
                where:{
                    isFeatured:true
                },
                include: {
                    model:ProductImage,
                    required: true,
                    order: [
                        ['createdAt', 'ASC']
                    ],
                },
                attributes:{
                    exclude: ["BusinessId"],
                    include: [
                        [
                            Sequelize.literal(`(
                                SELECT AVG(rate)
                                FROM Reviews AS review
                                WHERE
                                    productId = Product.id
                            )`),
                            'rating'
                        ],
                        [
                            Sequelize.literal(`(
                                SELECT count(*)
                                FROM Reviews AS review
                                WHERE
                                    productId = Product.id
                            )`),
                            'ratingCount'
                        ]
                    ],
                }
            });
            successResponse(res,product)
        }

    } catch (error) {
        errorResponse(res,error)
    }
}

const getBusinessSectorProducts = async(req,res)=>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit
        
        const uuid = req.params.uuid
        const businessSector = await BusinessSector.findOne({
            where: {
                uuid
            }
        })

        const {count, rows} = await Product.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            order:['createdAt','DESC'],
            distinct:true,
            attributes:{
                exclude:['BusinessId'],
                include: [
                    [
                        Sequelize.literal(`(
                            SELECT AVG(rate)
                            FROM Reviews AS review
                            WHERE
                                productId = Product.id
                        )`),
                        'rating'
                    ],
                    [
                        Sequelize.literal(`(
                            SELECT count(*)
                            FROM Reviews AS review
                            WHERE
                                productId = Product.id
                        )`),
                        'ratingCount'
                    ]
                ],
            },
            include: [
                {
                    model:ProductImage,
                    required:true,
                },
                {
                    model: Business,
                    required:true,
                    attributes:{
                        exclude: ['UserId','BusinessSectorId'],
                    },
                    where: {
                        businessSectorId: businessSector.id
                    }
                }
            ]
        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res,error)
    }
}

const getTopRatedProducts = async(req,res)=>{
    try {
        const product = await Product.findAll({
            limit: 12,
            attributes:{
                exclude: ['BusinessId'],
                include: [
                    [
                        Sequelize.literal(`(
                            SELECT AVG(rate)
                            FROM Reviews AS review
                            WHERE
                                productId = Product.id
                        )`),
                        'rating'
                    ],
                    [
                        Sequelize.literal(`(
                            SELECT count(*)
                            FROM Reviews AS review
                            WHERE
                                productId = Product.id
                        )`),
                        'ratingCount'
                    ]
                ],
            },
            order: [
                [Sequelize.literal('rating'), 'DESC']
            ],
            include: {
                model:ProductImage,
                required: true,
                order: [
                    ['createdAt', 'ASC']
                ],
            }
        });
        successResponse(res,product)
    } catch (error) {
        errorResponse(res,error)
    }
}

const getTopSellingProducts = async(req, res) =>{
    try {
        const response = await Product.findAll({
            limit: 12,
            attributes:{
                exclude: ["BusinessId"],
                include: [
                    [
                        Sequelize.literal(`(
                            SELECT SUM(quantity)
                            FROM OrderProducts AS order_product
                            WHERE
                                productId = Product.id
                        )`),
                        'total_sell_quantity'
                    ],
                    [
                        Sequelize.literal(`(
                            SELECT AVG(rate)
                            FROM Reviews AS review
                            WHERE
                                productId = Product.id
                        )`),
                        'rating'
                    ],
                    [
                        Sequelize.literal(`(
                            SELECT count(*)
                            FROM Reviews AS review
                            WHERE
                                productId = Product.id
                        )`),
                        'ratingCount'
                    ]
                ]
            },
            order: [
                [Sequelize.literal('total_sell_quantity'), 'DESC']
            ],
            include: {
                model:ProductImage,
                required: true,
                order: [
                    ['createdAt', 'ASC']
                ],
            }
        })
        successResponse(res, response)
    } catch (error) {
        errorResponse(res, error)
    }
}

const searchProduct = async(req, res) => {
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit
        
        const {itemName} = req.params
        const {count, rows} = await Product.findAndCountAll({
            offset: offset, //ruka ngapi
            limit: limit, //leta ngapi
            order:['createdAt','DESC'],
            distinct:true,
            where:{
                name: { [Op.like]: "%"+itemName+"%" },
            },
            attributes:{
                exclude: ["BusinessId"],
                include: [
                    [
                        Sequelize.literal(`(
                            SELECT AVG(rate)
                            FROM Reviews AS review
                            WHERE
                                productId = Product.id
                        )`),
                        'rating'
                    ],
                    [
                        Sequelize.literal(`(
                            SELECT count(*)
                            FROM Reviews AS review
                            WHERE
                                productId = Product.id
                        )`),
                        'ratingCount'
                    ]
                ],
            },
            include: {
                model:ProductImage,
                required: true,
                order: [
                    ['createdAt', 'ASC']
                ],
            }
        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res, {count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res, error)
    }
}

const getSearchedProduct = async(req, res) => {
    try {
        const {uuid} = req.body
        const result = await Product.findOne({
            where:{
                uuid,
            }
        })
        successResponse(res, result)
    } catch (error) {
        errorResponse(res, error)
    }
}

const deleteProduct = async(req, res) => {
    try {
        const uuid = req.params.uuid
        const product = await Product.findOne({
            where:{
                uuid
            }
        });
        const response = await product.destroy()
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

module.exports = {
    createProduct,updateProduct,getProduct,getProducts,getFeaturedProducts,getBusinessSectorProducts,
    getTopRatedProducts,getTopSellingProducts,searchProduct,getSearchedProduct,deleteProduct,BusinessProducts
}