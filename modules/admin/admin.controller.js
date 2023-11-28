const { User,Business,Product,Payment } = require("../../models");

const { successResponse, errorResponse } = require("../../utils/responses");
const {Op} = require("sequelize");


  const getAllUsers = async(req,res)=>{
    try {
        const response = await User.findAll({
        })
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
  }

  const getAllCustomers = async(req,res)=>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await User.findAndCountAll({
          offset: offset, //ruka ngapi
          limit: limit, //leta ngapi
          include:[Business,],
          where:{
            role: "customer"
          }
        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res,{count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res,error)
    }
  }

  const getAllSellers = async(req,res)=>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await User.findAndCountAll({
          offset: offset, //ruka ngapi
          limit: limit, //leta ngapi
          include:[Business,],
          where:{
            role: "seller"
          }
        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res,{count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res,error)
    }
  }

  const getAllAdmins = async(req,res)=>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await User.findAndCountAll({
          offset: offset, //ruka ngapi
          limit: limit, //leta ngapi
          include:[Business,],
          where:{
            role: "admin"
          }
        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res,{count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res,error)
    }
  }

  const getUserCounts = async(req,res)=>{
    try {
        const customers = await User.count({
          where:{
            role: "customer"
          }
        })
        const sellers = await User.count({
          where:{
            role: "seller"
          }
        })
        const admins = await User.count({
          where:{
            role: "admin"
          }
        })
        const revenue = await Payment.sum('amount')

        const products = await Product.count({})

        const applications = await Business.count({
          where:{
            status:"waiting"
          }
        })
        successResponse(res,{customers:customers, sellers:sellers, admins:admins, revenue: revenue==null?0:revenue, products:products, applications:applications  })
    } catch (error) {
        errorResponse(res,error)
    }
  }

  module.exports = {
    getAllUsers,
    getAllCustomers,
    getAllSellers,
    getAllAdmins,
    getUserCounts
  }