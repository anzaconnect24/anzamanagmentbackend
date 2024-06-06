const { errorResponse, successResponse } = require("../../utils/responses")
const {Notification,User,NotificationViewer, Sequelize} = require("../../models");
const { sendEmail } = require("../../utils/send_email");
const { Op } = require("sequelize");

const createNotification = async(req,res)=>{
    try {
         const {user_uuid,message,to } = req.body;
         console.log(req.body)
         let user;
         if(user_uuid){
             user = await User.findOne({
                where:{
                    uuid:user_uuid
                }
             })
         }
        const response = await Notification.create({
            to,message,userId:user_uuid&&user.id
        })        
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}


const addNotificationViewer = async(req,res)=>{
    try {
       const {uuid} = req.params
        const user = req.user;
        var response = await NotificationViewer.create({
            notificationId:uuid,
            userId:user.id
        })
        console.log(response)        
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}





const getUnreadNotifications = async (req, res) => {
    try {
        const user = req.user;
        const notifications = await Notification.findAll({
            where: {
                [Op.or]: [
                    { to: user.role },
                    { userId: user.id }
                ]
            },
            include: [{
                model: NotificationViewer,
                where: {
                    [Op.and]: [
                        { userId: user.id }
                    ]
                },
                required: false // Include all notifications, even if there's no corresponding record in NotificationViewer
            }],
        });
        const unreadNotifications = notifications.filter(notification => notification.NotificationViewers.length == 0);

        successResponse(res, unreadNotifications);
    } catch (error) {
        errorResponse(res, error);
    }
}



const getAllNotifications = async (req, res) => {
    try {
        const user = req.user;
        const notifications = await Notification.findAll();

        successResponse(res, notifications);
    } catch (error) {
        errorResponse(res, error);
    }
}

const deleteNotification = async (req, res) => {
    try {
        const {uuid} = req.params
        const notification = await Notification.findOne({
            uuid
        });
        const response =await notification.destroy()
        successResponse(res,response );
    } catch (error) {
        errorResponse(res, error);
    }
}
module.exports = {
    createNotification,getUnreadNotifications,addNotificationViewer,getAllNotifications,deleteNotification
}