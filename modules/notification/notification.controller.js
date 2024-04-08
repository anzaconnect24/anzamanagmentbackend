const { errorResponse, successResponse } = require("../../utils/responses")
const {Notification,User,NotificationViewer, Sequelize} = require("../../models");
const { sendEmail } = require("../../utils/send_email");
const { Op } = require("sequelize");

const createNotification = async(req,res)=>{
    try {

        var response = await Notification.create(req.body)        
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
            where:{
                [Op.or]:[ {
                    for: user.role
                },
                {
                    userId:user.id
                }
            ]
            },
            include: [{
                model: NotificationViewer,
                where: {
                    userId: user.id
                },
                required: false // Include all notifications, even if there's no corresponding record in NotificationViewer
            }],
            having: Sequelize.literal('COUNT(NotificationViewers.id) = 0') // Filter out notifications that have been viewed
        });

        successResponse(res, notifications);
    } catch (error) {
        errorResponse(res, error);
    }
}

module.exports = {
    createNotification,getUnreadNotifications,addNotificationViewer
}