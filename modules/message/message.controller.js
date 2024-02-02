const {User,Message,Conversation} = require("../../models");
const { successResponse, errorResponse } = require("../../utils/responses");

const createMessage = async(req,res)=>{
    try {
        const {message,conversation_uuid} = req.body;
        const conversation = await Conversation.findOne({
            where:{
                uuid:conversation_uuid
            }
        })
        const response = await Message.create({
            message,conversationId:conversation.id})
        req.io.to(conversation.uuid).emit("newMessage",response)
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}
const getMessages = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const conversation = await Conversation.findOne({
            where:{
                uuid
            }
        })
        const response = await Message.findAll({
            where:{
                conversationId:conversation.id
            },
            include:[{
                model:Conversation,
                include:[
                    {
                    model:User,
                    as:"user1"
                   },
                   {
                    model:User,
                    as:"user2"
                   } 
                ]    
            }]
        })
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

module.exports = {createMessage,getMessages}