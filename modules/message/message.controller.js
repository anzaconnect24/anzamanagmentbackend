const {User,Message,Conversation} = require("../../models");
const { successResponse, errorResponse } = require("../../utils/responses");
const { directContact } = require("../../utils/capital_gate");

const createMessage = async(req,res)=>{
    try {
        const {message,conversation_uuid} = req.body;
        const conversation = await Conversation.findOne({
            where:{
                uuid:conversation_uuid
            }
        })
        if(!conversation){
            return res.status(404).json({status:false,message:"Conversation not found"})
        }
        // A conversation opened before the capital facilitation rule is held to
        // it too: no startup-investor messages until Anza allows direct contact.
        const [one,two] = await Promise.all([
            User.findByPk(conversation.from,{attributes:["id","role"]}),
            User.findByPk(conversation.to,{attributes:["id","role"]}),
        ])
        if(one && two){
            const gate = await directContact(one,two)
            if(!gate.allowed){
                return res.status(403).json({status:false,message:gate.message})
            }
        }
        const response = await Message.create({
            message,conversationId:conversation.id})
        // Socket.io is not attached to requests in this API; emit only if it is.
        if(req.io){
            req.io.to(conversation.uuid).emit("newMessage",response)
        }
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