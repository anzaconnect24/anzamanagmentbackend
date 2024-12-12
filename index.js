const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const UserRoutes =  require("./modules/user/user.routes")
const CratMarketRoutes = require("./modules/crat_market/crat_market.routes")
const CratFinancialRoutes = require("./modules/crat_financial/crat_financial.routes")
const CratLegalRoutes = require("./modules/crat_legal/crat_legal.routes")
const CratOperationRoutes = require("./modules/crat_operation/crat_operation.routes")
const CratGeneralRoutes = require("./modules/crat_general/crat_general.routes")
const CratReviewerRoutes = require("./modules/reviewer/crat_reviewer.routes")
const RoleRoutes =  require("./modules/role/role.routes")
const PermissionRoutes =  require("./modules/permission/permission.routes")
const UserRoleRoutes =  require("./modules/user_role/user_role.routes")
const UserPermissionRoutes =  require("./modules/user_permission/user_permission.routes")
const ApplicationRoutes =  require("./modules/application/application.routes")
const ApplicationReviewRoutes =  require("./modules/application_review/application_review.routes")
const AttachmentRoutes =  require("./modules/attachment/attachment.routes")
const BusinessRoutes =  require("./modules/business/business.routes")
const BusinessReviewRoutes =  require("./modules/business_review/business_review.routes")
const ProgramRoutes =  require("./modules/program/program.routes")
const ProgramApplicationRoutes =  require("./modules/program_application/program_application.routes")
const ProgramApplicationReviewRoutes =  require("./modules/program_application_review/program_application_review.routes")
const BusinessInvestmentRequestRoutes =  require("./modules/business_investment_request/business_investment_request.routes")
const BusinessInvestmentRequestReviewRoutes =  require("./modules/business_investment_request_review/business_investment_request_review.routes")
const InvestorProfileRoutes =  require("./modules/investor_profile/investor_profile.routes")
const ProgramUpdateRoutes =  require("./modules/program_update/program_update.routes")
const PitchMaterialRoutes =  require("./modules/pitch_material/pitch_material.routes")
const BusinessDocumentRoutes =  require("./modules/business_document/business_document.routes")
const LogRoutes =  require("./modules/log/log.routes")
const InvestmentInterestRoutes =  require("./modules/investment_interest/investment_interest.routes")
const SuccessStoryRoutes =  require("./modules/success_story/success_story.routes")
const ConversationRoutes = require("./modules/conversation/conversation.routes")
const MessageRoutes = require("./modules/message/message.routes")
const ProductRoutes =  require("./modules/product/product.routes")
const WishlistRoutes =  require("./modules/wishlist/wishlist.routes")
const OrderRoutes =  require("./modules/order/order.routes")
const ProductImageRoutes =  require("./modules/product_image/product_image.routes")
const BusinessSectors =  require("./modules/sector/sector.routes")
const Reviews =  require("./modules/review/review.routes")
const Favourites =  require("./modules/favourite/favourite.routes")
const Promotions =  require("./modules/promotion/promotion.routes")
const Payments =  require("./modules/payment/payment.routes")
const Admin =  require("./modules/admin/admin.routes")
const Seller =  require("./modules/seller/seller.routes")
const NotificationRoutes =  require("./modules/notification/notification.routes")
const Subscription =  require("./modules/subscription/subscription.routes")
// ********************
const app = express();

app.use("/files", express.static("files"));
app.use(cors());
app.use(express.json());
app.use(bodyParser.text({ type: "/" }));

app.use("/user",UserRoutes)
app.use("/notification",NotificationRoutes)
app.use("/role",RoleRoutes)
app.use("/permission",PermissionRoutes)
app.use("/user_role",UserRoleRoutes)
app.use("/user_permission",UserPermissionRoutes)
app.use("/application",ApplicationRoutes)
app.use("/application_review",ApplicationReviewRoutes)
app.use("/attachment",AttachmentRoutes)
app.use("/business",BusinessRoutes)
app.use("/business_review",BusinessReviewRoutes)
app.use("/program",ProgramRoutes)
app.use("/program_application",ProgramApplicationRoutes)
app.use("/program_application_review",ProgramApplicationReviewRoutes)
app.use("/investor_profile",InvestorProfileRoutes)
app.use("/program_update",ProgramUpdateRoutes)
app.use("/conversation",ConversationRoutes)
app.use("/pitch_material",PitchMaterialRoutes)
app.use("/business_investment_request",BusinessInvestmentRequestRoutes)
app.use("/business_investment_request_review",BusinessInvestmentRequestReviewRoutes)
app.use("/business_document",BusinessDocumentRoutes)
app.use("/log",LogRoutes)
app.use("/investment_interest",InvestmentInterestRoutes)
app.use("/success_story",SuccessStoryRoutes)
app.use("/product",ProductRoutes)
app.use("/order",OrderRoutes)
app.use("/wishlist",WishlistRoutes)
app.use("/sector",BusinessSectors)
app.use("/review",Reviews)
app.use("/favourite",Favourites)
app.use("/promotion",Promotions)
app.use("/payment",Payments)
app.use("/admin",Admin)
app.use("/seller",Seller)
app.use("/subscription",Subscription)
app.use("/crat_market",CratMarketRoutes)
app.use("/crat_financial",CratFinancialRoutes)
app.use("/crat_legal",CratLegalRoutes)
app.use("/crat_operation",CratOperationRoutes)
app.use("/crat_general",CratGeneralRoutes)
app.use("/reviewer",CratReviewerRoutes)






// app.post("/sendEmail",async(req,res)=>{
//   try {
//     const {email} = req.body
//     const user = await User.findOne({
//       where:{
//         email
//       }
//     })
//     const response = await sendMail(user,"Testing","Hello",true)
//     successResponse(res,)
//   } catch (error) {
//     errorResponse(res,error)
//   }
// })

app.get('/',(req,res)=>{
    res.send("Anza management system API's are okay!")
})
 app.listen(5001,()=>{
  console.log("Server started at port 5001")
})

