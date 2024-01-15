const { User,Business,InvestorProfile,BusinessSector, Product,Role } = require("../../models");
const getUrl = require("../../utils/cloudinary_upload");

const { generateJwtTokens } = require("../../utils/generateJwtTokens");
const { successResponse, errorResponse } = require("../../utils/responses");
const bcrypt = require('bcrypt')
const {Op} = require("sequelize");
const sendSMS = require("../../utils/send_sms");
const addPrefixToPhoneNumber = require("../../utils/add_number_prefix");
const { resetPassword, sendMail } = require("../../utils/mail_controller");
// const business = require("../../models/business");


const sendMessage = async (req, res) => {
  try {
    const { to, type, subject, message } = req.body;

    let promises = []; // Array to hold promises

    switch (to) {
      case "all":
        const users = await User.findAll();
        users.forEach(async (user) => {
          switch (type) {
            case "all":
              promises.push(sendSMS(addPrefixToPhoneNumber(user.phone), message));
              promises.push(sendMail(user.email, subject, message));
              break;
            case "sms":
              promises.push(sendSMS(addPrefixToPhoneNumber(user.phone), message));
              break;
            case "mail":
              promises.push(sendMail(user.email, subject, message));
              break;
            default:
              break;
          }
        });
        break;
      
      default:
        const user = await User.findOne({
          where: {
            email: to,
          },
        });
        if(user){
          switch (type) {
            case "all":
              promises.push(sendSMS(addPrefixToPhoneNumber(user.phone), message));
              promises.push(sendMail(user.email, subject, message));
              break;
            case "sms":
              promises.push(sendSMS(addPrefixToPhoneNumber(user.phone), message));
              break;
            case "mail":
              promises.push(sendMail(user.email, subject, message));
              break;
            default:
              break;
          }
        }
        else{
           if(to.includes("@")){
            promises.push(sendMail(to, subject, message));

           }
           else{
            promises.push(sendSMS(addPrefixToPhoneNumber(to), message));
           }
        }
        break;
    }

    await Promise.all(promises);

    successResponse(res, true);
  } catch (error) {
    errorResponse(res, error);
  }
};

const sendPasswordLink = async (req,res)=>{
  try {
    const {email} = req.body
    const user = await User.findOne({
      where:{
        email
      }
    })
    if (!user) {
      res.status(404).json({
        status: false,
        message: "User does not exist"
      });
    }
    else{
      await resetPassword(user)
    }
    successResponse(res,true)
  } catch (error) {
    errorResponse(res,error)
  }
}
const passwordReset = async (req,res)=>{
  try {
    let {password} = req.body;
    const uuid = req.params.uuid
    const user = await User.findOne({
      where:{
        uuid
      }
    })
    const hashedPassword = bcrypt.hashSync(password, 10);
    password = hashedPassword;
    const response = user.update({
      password
    })
    successResponse(res,response)
  } catch (error) {
    errorResponse(res,error)
  }
}
const pushSMS = async(req,res)=>{
  try {
    const {message} = req.body;
    let numbers = []

    const response = await sendSMS(numbers,message)
    successResponse(res,response)
  } catch (error) {
    errorResponse(res,error)
  }
}
const registerUser = async (req, res) => {
    try {
      const {
        name,
        email,
        phone,
        password,
        role
      } = req.body;
      console.log(role)
      console.log(name)
      console.log(email)
      console.log(password)
      console.log(phone)


    
      const user = await User.findOne({ where: { email } });
      if (user) {
        res.status(403).json({
          status: false,
          message: "Email is already registered"
        });
      } else {
        const hashedPassword = bcrypt.hashSync(password, 10);
        const user = await User.create({
          name,
          phone,
          email,
          password: hashedPassword,
          role
        });  
        const response = await User.findOne({
          where: {
            email: email
          }
        });
        // sendSMS(addPrefixToPhoneNumber(phone),`Thank you for joining Shule Alumni as ${name}. You can now interact with and meet other alumni in the system.`)
        
        const tokens = generateJwtTokens(response)
        res.status(201).json({
          status: true,
          tokens
        });
      }
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "Internal server error",
        error: error
      });
      console.log(error);
    }
};
const updateMyInfo = async (req, res) => {
  try {
    const user = req.user 
    const userDetails = await User.findOne({
      where: {
        uuid:user.uuid
      },
    });
    const response = await userDetails.update(req.body);
    successResponse(res, response);
  } catch (error) {
    console.log(error);
    errorResponse(res, error);
  }
};

const updateUser = async (req, res) => {
  try {
    const uuid = req.params.uuid; // Move this line to after getting user object
    let {
      password,
     
      ...otherFields // Use object destructuring to collect other fields
    } = req.body;
   
    if (password && password.length < 15) {
      const hashedPassword = bcrypt.hashSync(password, 10);
      password = hashedPassword;
    } else {
      delete otherFields.password;
    }
    let image = null;
    if (req.file) {
      image = await getUrl(req);
    }

    const user = await User.findOne({
      where: {
        uuid
      }
    });

    const response = await user.update({
      password,
      image,
      ...otherFields 
    });

    successResponse(res, response);
  } catch (error) {
    console.log(error);
    errorResponse(res, error);
  }
};

const deleteUser = async(req,res)=>{
    try {     
        const uuid = req.params.uuid
        const user = await User.findOne({
            where:{
                uuid
            }
        })
        const response =  await user.destroy()
        successResponse(res,response)
    } catch (error) {
        errorResponse(res,error)
    }
}

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) {
      res.status(404).json({
        status: false,
        message: "User does not exist"
      });
    } else {
      if (await bcrypt.compare(password, user.password)) {
        const response = await User.findOne({
          where: {
            email: email
          },
          include:[Business]
        });
        const tokens = generateJwtTokens(response)
          res.status(200).json({
            status: true,
            tokens
          });
        
        
      } else {
        res.status(403).json({
          status: false,
          message: "Wrong password"
        });
      }
    }
  } catch (error) {
    // internalError();
    errorResponse(res,error)
  }
};



  const getUsersByRole = async(req,res)=>{
    try {
      const uuid = req.params.uuid

      let {page,limit} = req.query
      page = parseInt(page)
      limit = parseInt(limit)
      const offset = (page-1)*limit

      const role = await Role.findOne({
        where:{
          uuid
        }
      })

      const {count, rows} = await User.findAndCountAll({
        offset: offset, //ruka ngapi
        limit: limit, //leta ngapi
        include:{
          model:UserRole,
          required:true,
          where:{
            roleId:role.id
          }
        }
      })
      const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
      successResponse(res,{count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res,error)
    }
  }


  const getUsers = async(req,res)=>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await User.findAndCountAll({
          offset: offset, //ruka ngapi
          limit: limit, //leta ngapi     
        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res,{count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res,error)
    }
  }
  
  const getReviewers = async(req,res)=>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await User.findAndCountAll({
          offset: offset, //ruka ngapi
          limit: limit, //leta ngapi
          include:[Business,],
          where:{
            role: "Reviewer"
          }
        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res,{count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res,error)
    }
  }
  const getInvestors = async(req,res)=>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await User.findAndCountAll({
          offset: offset, //ruka ngapi
          limit: limit, //leta ngapi
          include:[Business,],
          where:{
            role: "Investor"
          }
        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res,{count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res,error)
    }
  }
  const getEnterprenuers = async(req,res)=>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await User.findAndCountAll({
          offset: offset, //ruka ngapi
          limit: limit, //leta ngapi
          include:[Business],
          where:{
            role: "Enterprenuer"
          }
        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res,{count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res,error)
    }
  }

  const getAdmins = async(req,res)=>{
    try {
        let {page,limit} = req.query
        page = parseInt(page)
        limit = parseInt(limit)
        const offset = (page-1)*limit

        const {count, rows} = await User.findAndCountAll({
          offset: offset, //ruka ngapi
          limit: limit, //leta ngapi
          include:[Business,],
          where:{
            role: "Admin"
          }
        })
        const totalPages = (count%limit)>0?parseInt(count/limit)+1:parseInt(count/limit)
        successResponse(res,{count, data:rows, page, totalPages})
    } catch (error) {
        errorResponse(res,error)
    }
  }

  const getUserCounts = async(req,res)=>{
    try {
        const customers = await User.count({
          where:{
            role: "customer"
          }
        })
        const sellers = await User.count({
          where:{
            role: "seller"
          }
        })
        const admins = await User.count({
          where:{
            role: "admin"
          }
        })
        // const revenue = await Payment.count('amount')

        // const products = await Product.count({})

        const applications = await Business.count({
          where:{
            status:"waiting"
          }
        })
        successResponse(res,{customers:customers, sellers:sellers, admins:admins, /*revenue: revenue, products:products,*/ applications:applications  })
    } catch (error) {
        errorResponse(res,error)
    }
  }

const getMyDetails = async(req,res)=>{
  const user = req.user
  try {
      const response = await User.findOne({
        where:{id:user.id},
        include:[
          Business,
          {
            model: InvestorProfile,
            include:{
              model: BusinessSector
            }
          }
        ]
      })
      successResponse(res,response)
  } catch (error) {
      errorResponse(res,error)
  }
}
const getUserDetails = async(req,res)=>{
    try {
        const uuid = req.params.uuid
        const user = await User.findOne({
            where:{
                uuid
            },
            include:[{
              model:InvestorProfile,
              include:[BusinessSector]
            }]
        });
        successResponse(res,user)
    } catch (error) {
        errorResponse(res,error)
    }
}
 


  const getHash = async(req,res)=>{
    try {
    const password =  bcrypt.hashSync("password",10)
    successResponse(res,password)
    } catch (error) {
      errorResponse(res,error)
    }
  }
  module.exports = {
    registerUser,
    loginUser,
    getHash,
    updateMyInfo,
    updateUser,
    deleteUser,
    getReviewers,
    sendMessage,
    sendPasswordLink,
    passwordReset,
    pushSMS,
    getUserDetails,
    getUsers,
    getAdmins,
    getReviewers,
    getEnterprenuers,
    getInvestors,
    getUserCounts,
    getMyDetails,
    getUsersByRole
  }