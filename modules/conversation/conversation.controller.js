
const {User,Conversation} = require("../../models")
const {Op} = require("sequelize");
const { successResponse, errorResponse } = require("../../utils/responses");
const createConversation = async(req,res)=>{
    try {
        const {lastMessage,to,type} = req.body;
        const fromUser = req.user
        const toUser = await User.findOne({
            where:{
                uuid:to
            }
        })
        const conversation = await Conversation.findOne({
            where:{[Op.and]:[{
                from : fromUser.id,
            },{
                to : toUser.id,
            }],}
        })
        let response
        if(conversation===null){
        response = await Conversation.create({
                type,
                lastMessage,from:fromUser.id,to:toUser.id})
        }
        else{
           response = conversation
        }
       
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}
const getUserConversations = async(req,res)=>{
    try {
        const user = req.user
        const response = await Conversation.findAll({
           include:[
            {
            model:User,
            as:"user1"
           },
           {
            model:User,
            as:"user2"
           }
        
        ],
            where:{
                [Op.or]:[
                    {
                        from:user.id
                    },
                    {
                        to:user.id
                    }
                ]
            }
        })
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

module.exports = {createConversation,getUserConversations}
