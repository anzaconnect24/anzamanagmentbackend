const { errorResponse, successResponse } = require("../../utils/responses")
const {BusinessSector, Business, Product} = require("../../models");


const createBusinessSector = async(req,res)=>{
    try {
      
        const {
            name
        } = req.body;
        
        const businessSector = await BusinessSector.findOne({
            where:{
                name
            }
        });

        if (businessSector) {
            res.status(200).send("This sector already created!")
        } else {
            const response = await BusinessSector.create({
                name
            })
            successResponse(res,response)
        }
    } catch (error) {
        errorResponse(res,error)
    }
}

const getAllBusinessSector = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const response = await BusinessSector.findAll({
            attributes:{
                exclude:["id"/*,"uuid","name","createdAt","updatedAt"*/]
            },
        })
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const getBusinessSector = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const response = await BusinessSector.findOne({
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

const getBusinessSectorProducts = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const response = await BusinessSector.findOne({
            where:{
                uuid
            },
            attributes:{
            exclude:["id"/*,"uuid","name","createdAt","updatedAt"*/]
            },
            include:[{
                model:Business,
                attributes:{
                    exclude:["id"/*,"uuid","name","userId","businessSectorId","region","description","active","createdAt","updatedAt"*/]
                },
                include:[{
                    model: Product,
                    attributes:{
                        exclude:["id"]
                    },
                }]
            }]
        })
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const deleteSector = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const sector = await BusinessSector.findOne({
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

module.exports = {createBusinessSector, getBusinessSector, getAllBusinessSector, getBusinessSectorProducts, deleteSector}