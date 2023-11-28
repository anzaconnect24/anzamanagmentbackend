const { User,Business,Product,OrderProduct,Payment,Order, Sequelize } = require("../../models");

const { successResponse, errorResponse } = require("../../utils/responses");
const {Op} = require("sequelize");


  const getCounts = async(req,res)=>{
    var totalBuyingPrice = 0,totalSellingPrice = 0, profit = 0
    const user = req.user

    if (user.Business) {
        try {
            const pending = await OrderProduct.sum('quantity',{
                include:{
                    model:Product,
                    required:true,
                    include:{
                        required:true,
                        model:Business,
                        where:{
                            userId:user.id
                        }
                    }
                },
                where:{
                    status: "waiting"
                }
            })
            const complete = await OrderProduct.sum('quantity',{
                include:{
                    model:Product,
                    required:true,
                    include:{
                        required:true,
                        model:Business,
                        where:{
                            userId:user.id
                        }
                    }
                },
                where:{
                    status: "delivered"
                }
            })
            const sales = await OrderProduct.sum('quantity',{
                include:{
                    model:Product,
                    required:true,
                    include:{
                        model:Business,
                    required:true,
                        where:{
                            userId:user.id
                        }
                    }
                },
            })

            // CALCULATE PROFIT
            const business = await Business.findOne({
                where:{
                    userId:user.id
                }
            })
            const profit_query = await OrderProduct.findAll({
                include:{
                    model:Product,
                    where:{
                        businessId:business.id,
                    }
                },
                // attributes:{
                //     include: [
                //         [
                //             Sequelize.literal(`(
                //                 SELECT buyingPrice
                //                 FROM Products AS product
                //                 WHERE
                //                     id = OrderProduct.productId
                //             )`),
                //             'buyingPrice'
                //         ],
                //         [
                //             Sequelize.literal(`(
                //                 SELECT sellingPrice
                //                 FROM Products AS product
                //                 WHERE
                //                     id = OrderProduct.productId
                //             )`),
                //             'sellingPrice'
                //         ]
                //     ],
                // },
            })
            for (let index = 0; index < profit_query.length; index++) {
                const element = profit_query[index];
                // res.send({data: element})
                // res.send({data: element.quantity})
                // res.send({data: element.Product.buyingPrice})

                totalBuyingPrice += element.Product.buyingPrice * element.quantity
                totalSellingPrice += element.Product.sellingPrice * element.quantity
            }
            profit = totalSellingPrice - totalBuyingPrice
            // END CALCULATE PROFIT

            const products = await Product.count({
                include:{
                    model:Business,
                    required:true,
                    where:{
                        userId:user.id,
                    }
                }
            })
            const in_stock = await Product.count({
                include:{
                    model:Business,
                    required:true,
                    where:{
                        userId:user.id,
                    }
                },
                where:{
                    amount:{[Op.gt]:0},
                }
            })
            const out_stock = await Product.count({
                include:{
                    model:Business,
                    required:true,
                    where:{
                        userId:user.id,
                    }
                },
                where:{
                    amount:{[Op.lte]:0},
                }
            })

            successResponse(res,{pending:pending==null?0:pending, complete:complete==null?0:complete, sales: sales==null?0:sales, profit: profit, products:products, in_stock:in_stock, out_stock:out_stock,
                totalBuyingPrice:totalBuyingPrice,totalSellingPrice:totalSellingPrice,  })
        } catch (error) {
            errorResponse(res,error)
        }        
    } else {
        res.status(403).json({message:"You don't own a business!"});
    }

  }

  module.exports = {
    getCounts,
  }