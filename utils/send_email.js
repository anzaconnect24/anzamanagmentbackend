const { errorResponse, successResponse } = require("../utils/responses")
const { sendMail } = require("../utils/mail_controller");

const sendEmail = async (req, res,user,status) => {
    // res.status(200).send(user.email+","+status);
    try {
      var subject = '',message = '';
      var response;
      switch (status) {
        case "accepted":
            subject = 'Your seller application to Anza Marketplace is accepted'
            message = 'Hello '+user.name+',<br>This is to inform you that we have accepted your request to be a seller,<br>You can now start adding your products to Anza marketplace store.'
            response =   await sendMail(user, subject, message, status);
          break;
        case "rejected":
            subject = 'Your seller application to Anza Marketplace is rejected'
            message = 'Hello '+user.name+',<br>This is to inform you that we have rejected your request to be a seller,<br>You can contact us for more information through phone: +255 000 000 0000,email: anza@email.com.'
            response =   await sendMail(user, subject, message, status);
          break;
        case "order":
            subject = 'Your order has been placed at Anza Marketplace'
            message = 'Hello '+user.name+',<br>This is to inform you that your order has been placed and payment was successful.<br>You can now wait for the delivery of your items.'
            response =   await sendMail(user, subject, message, status);
          break;
        case "customer_promotion":
            subject = 'Special Promotion Just for You'
            message = 'Hello '+user.name+'!,<br>We\'re offering a special promotion of 10% off your next purchase!.'
            response =   await sendMail(user, subject, message, status);
          break;
        case "seller_promotion":
            subject = 'Special Promotion Just for You'
            message = 'Hello '+user.name+'!,<br>We\'re offering a special promotion of 10% fee discount on your next sells in 2 days!.'
            response =   await sendMail(user, subject, message, status);
          break;
        default:
          break;
      }  
      successResponse(res, response);
    } catch (error) {
      errorResponse(res, error);
    }
}

module.exports = { sendEmail };