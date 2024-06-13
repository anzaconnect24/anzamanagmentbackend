const { errorResponse, successResponse } = require("../../utils/responses")
const {User} = require("../../models");
const { sendEmail } = require("../../utils/send_email");

const broadcastPromotion = async(req,res)=>{
    try {
        let promises = [];
        const role = req.params.role;
        const user = await User.findAll({
            where:{role}
        })

        for (let index = 0; index < user.length; index++) {
            promises.push(sendEmail(req, res, user[index], role+'_promotion')) 
        }
        await Promise.all(promises);
        successResponse(res,order)
    } catch (error) {
        errorResponse(res,error)
    }
}

module.exports = {broadcastPromotion}