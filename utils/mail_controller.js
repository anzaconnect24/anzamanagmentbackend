const nodemailer = require("nodemailer");
require('dotenv').config(); 
const ejs = require('ejs')
const fs = require("fs")
const path = require("path")

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", // Gmail SMTP server
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false, // Add this line
  },
});

const sendMail = (user,subject,message,status)=>{
  try {
      const templatePath = path.join(__dirname, 'email_template.ejs');
      const emailParams = {
          from: 'Anza Management System',
          to: user.email,
          subject: subject,
          html:ejs.render(fs.readFileSync(templatePath, 'utf8'), {subject:subject,message:message,status:status })
        };
  const response = transporter.sendMail(emailParams)
      return response
  } catch (error) {
      console.log(error)
  }
}
const resetPassword = (user)=>{
  try {
      const templatePath = path.join(__dirname, 'password_reset.ejs');
      const emailParams = {
          from: 'Anza Management System',
          to: user.email,
          subject: 'Reset password',
          html:ejs.render(fs.readFileSync(templatePath, 'utf8'), { name:user.name,link:user.uuid }),
        };
  const response = transporter.sendMail(emailParams)
      return response
  } catch (error) {
      console.log(error)
  }
}


module.exports= {sendMail,resetPassword}