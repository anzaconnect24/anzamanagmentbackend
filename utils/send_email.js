const { errorResponse, successResponse } = require("../utils/responses")
const { sendMail } = require("../utils/mail_controller");

const sendEmail = async (req, res,user,status) => {
    // res.status(200).send(user.email+","+status);
    try {
      var subject = '',message = '';
      var response;
      switch (status) {
        case "accepted":
            subject = 'Your entrepreneur application to Anza Management System is accepted'
            message = 'Hello '+user.name+',<br>This is to inform you that we have accepted your request to be an entrepreneur,<br>You can contact us for more information through phone: +255 000 000 0000,email: anzaentrepreneurs@gmail.com.'
            response =   await sendMail(user, subject, message, status);
          break;
        case "rejected":
            subject = 'Your entrepreneur application to Anza Management System is rejected'
            message = 'Hello '+user.name+',<br>This is to inform you that we have rejected your request to be an entrepreneur,<br>You can contact us for more information through phone: +255 000 000 0000,email: anzaentrepreneurs@gmail.com.'
            response =   await sendMail(user, subject, message, status);
          break;
        case "order":
            subject = 'Your order has been placed at Anza Management System'
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
        case "assigned_business_investment":
            subject = 'Assigned to review business investment'
            message = 'Hello '+user.name+'!,<br>This is to inform you that you have been assigned task to <a href="https://anzamanagementsystem.vercel.app/">review business investment</a>'
            response =   await sendMail(user, subject, message, status);
          break;
        case "assigned_program_application":
            subject = 'Assigned to review program application'
            message = 'Hello '+user.name+'!,<br>This is to inform you that you have been assigned task to <a href="https://anzamanagementsystem.vercel.app/">review program application</a>'
            response =   await sendMail(user, subject, message, status);
          break;
        case "registration":
            subject = 'New user registration'
            message = 'Hello '+user.name+'!,<br>New user have registered, You need to <a href="https://anzamanagementsystem.vercel.app/">activate his/her account</a>'
            response =   await sendMail(user, subject, message, status);
          break;
        case "email_confirmation":
          subject = 'Email confirmation'
          message = 'Hello '+user.name+`!,<br>Confirm your email by clicking this link, <a href="http://localhost:3000/emailConfirmation/${user.uuid}">Confirm email</a>`
          response =   await sendMail(user, subject, message, status);
        break;
        case "user_invitation":
          subject = 'Invitation to join Anza platform'
          message = 'Hello'+`!,<br>Join Anza platform to connect with investors and fellow enterprenuers, <a href="https://anzamanagementsystem.vercel.app/">Join now</a>`         
          response = await sendMail(user, subject, message, status);
        break;
        case "program_application":
            subject = 'New user program application'
            message = 'Hello '+user.name+'!,<br>New user have applied for a program, <a href="https://anzamanagementsystem.vercel.app/">Assign a reviewer for this application</a>'
            response =   await sendMail(user, subject, message, status);
          break;
        case "business_investment_request":
            subject = 'New business investment request'
            message = 'Hello '+user.name+'!,<br>An investor has just applied to invest on a business, <a href="https://anzamanagementsystem.vercel.app/">You can take action(accept/reject) here</a>'
            response =   await sendMail(user, subject, message, status);
          break;
        default:
          break;
      }  
      // successResponse(res, response);
    } catch (error) {
      return error
      errorResponse(res, error);
    }
}

module.exports = { sendEmail };