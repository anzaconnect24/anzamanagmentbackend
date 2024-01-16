const { User,Business,Program,ProgramApplication,ProgramUpdate,Sequelize } = require("../../models");

const { successResponse, errorResponse } = require("../../utils/responses");
const {Op, where} = require("sequelize");


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
        const totalUsers = await User.count({})

        const enterprenuers = await User.count({
          where:{
            role: "Enterprenuer"
          }
        })
        const investors = await User.count({
          where:{
            role: "Investor"
          }
        })
        const reviewers = await User.count({
          where:{
            role: "Reviewer"
          }
        })
        const admins = await User.count({
          where:{
            role: "Admin"
          }
        })

        const pendingBusiness = await Business.count({
          where:{
            status:"waiting"
          }
        })
        const pendingUser = await User.count({
          where:{
            activated:false
          }
        })
        const pendingProgramApplication = await ProgramApplication.count({
          where:{
            status:"waiting"
          }
        })
        const totalProgram = await Program.count({})
        const totalProgramapplication = await ProgramApplication.count({})
        const totalProgramupdate = await ProgramUpdate.count({})

        const bfa = await ProgramApplication.findAll({
          include:[
            {
              model: Program,
              where:{
                type:'bfa'
              },
            }
          ],
          attributes: {
            include: [
              [Sequelize.fn("MONTH", Sequelize.col("ProgramApplication.createdAt")), "month"],
            ],
          },
          group: ['month']
        })

        const ira = await ProgramApplication.findAll({
          include:[
            {
              model: Program,
              where:{
                type:'ira'
              },
            }
          ],
          attributes: {
            include: [
              [Sequelize.fn("MONTH", Sequelize.col("ProgramApplication.createdAt")), "month"],
            ],
          },
          group: ['month']
        })

        successResponse(res,{enterprenuers:enterprenuers, investors:investors, reviewers:reviewers, admins:admins, totalUsers:totalUsers, 
        pendingBusiness:pendingBusiness, pendingUser:pendingUser, pendingProgramApplication:pendingProgramApplication, 
        totalProgram:totalProgram, totalProgramapplication:totalProgramapplication, totalProgramupdate:totalProgramupdate, bfa:bfa, ira:ira})
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