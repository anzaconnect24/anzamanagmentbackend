const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const swaggerUi = require("swagger-ui-express");

const UserRoutes = require("./modules/user/user.routes");
const CratMarketRoutes = require("./modules/crat_market/crat_market.routes");
const CratFinancialRoutes = require("./modules/crat_financial/crat_financial.routes");
const CratLegalRoutes = require("./modules/crat_legal/crat_legal.routes");
const CratOperationRoutes = require("./modules/crat_operation/crat_operation.routes");
const CratGeneralRoutes = require("./modules/crat_general/crat_general.routes");
const CratReviewerRoutes = require("./modules/reviewer/crat_reviewer.routes");
const RoleRoutes = require("./modules/role/role.routes");
const PermissionRoutes = require("./modules/permission/permission.routes");
const UserRoleRoutes = require("./modules/user_role/user_role.routes");
const UserPermissionRoutes = require("./modules/user_permission/user_permission.routes");
const ApplicationRoutes = require("./modules/application/application.routes");
const ApplicationReviewRoutes = require("./modules/application_review/application_review.routes");
const AttachmentRoutes = require("./modules/attachment/attachment.routes");
const BusinessRoutes = require("./modules/business/business.routes");
const BusinessReviewRoutes = require("./modules/business_review/business_review.routes");
const ProgramRoutes = require("./modules/program/program.routes");
const BusinessInvestmentRequestRoutes = require("./modules/business_investment_request/business_investment_request.routes");
const BusinessInvestmentRequestReviewRoutes = require("./modules/business_investment_request_review/business_investment_request_review.routes");
const InvestorProfileRoutes = require("./modules/investor_profile/investor_profile.routes");
const PitchMaterialRoutes = require("./modules/pitch_material/pitch_material.routes");
const BusinessDocumentRoutes = require("./modules/business_document/business_document.routes");
const LogRoutes = require("./modules/log/log.routes");
const InvestmentInterestRoutes = require("./modules/investment_interest/investment_interest.routes");
const SuccessStoryRoutes = require("./modules/success_story/success_story.routes");
const ConversationRoutes = require("./modules/conversation/conversation.routes");
const MessageRoutes = require("./modules/message/message.routes");
const ProductRoutes = require("./modules/product/product.routes");
const WishlistRoutes = require("./modules/wishlist/wishlist.routes");
const OrderRoutes = require("./modules/order/order.routes");
const ProductImageRoutes = require("./modules/product_image/product_image.routes");
const BusinessSectors = require("./modules/sector/sector.routes");
const Reviews = require("./modules/review/review.routes");
const Favourites = require("./modules/favourite/favourite.routes");
const Promotions = require("./modules/promotion/promotion.routes");
const Payments = require("./modules/payment/payment.routes");
const Admin = require("./modules/admin/admin.routes");
const ModulesRoutes = require("./modules/modules/modules.routes");
const SlidesRoutes = require("./modules/slides/slides.routes");
const CommentsRoutes = require("./modules/comments/comments.routes");
const MentorProfileRoutes = require("./modules/mentor_profile/mentorProfile.routes");
const StaffProfileRoutes = require("./modules/staff_profile/staffProfile.routes");
const Seller = require("./modules/seller/seller.routes");
const NotificationRoutes = require("./modules/notification/notification.routes");
const Subscription = require("./modules/subscription/subscription.routes");
const MentorEntreprenuerRoutes = require("./modules/mentor_entreprenuer/mentorEntreprenuer.routes");
const MentorReportRoutes = require("./modules/mentor_reports/mentorReports.routes");
const StatsRoutes = require("./modules/stats/stats.routes");
const InvestmentOpportunities = require("./modules/investmentOpportunities/investmentOpportunities.routes");
const MentorshipApplicationRoutes = require("./modules/mentorshipApplications/mentorshipApplications.routes");
const InvestmentApplicationRoutes = require("./modules/investmentApplications/investmentApplications.routes");
const {
  usersTag,
  statsTag,
  notificationsTag,
  rolesTag,
  permissionsTag,
  userRolesTag,
  userPermissionsTag,
  applicationsTag,
  applicationReviewsTag,
  attachmentsTag,
  businessDocumentsTag,
  businessReviewsTag,
  mentorEntrepreneursTag,
  mentorReportsTag,
  programsTag,
  investorProfilesTag,
  conversationsTag,
  pitchMaterialsTag,
  businessInvestmentRequestsTag,
  businessInvestmentRequestReviewsTag,
  logsTag,
  investmentInterestsTag,
  successStoriesTag,
  productsTag,
  ordersTag,
  wishlistsTag,
  sectorsTag,
  reviewsTag,
  favouritesTag,
  promotionsTag,
  paymentsTag,
  adminTag,
  sellersTag,
  subscriptionsTag,
  cratFinancialTag,
  cratMarketTag,
  cratLegalTag,
  cratOperationsTag,
  cratGeneralTag,
  staffProfileTag,
  mentorProfileTag,
  investmentApplicationTag,
  mentorshipApplicationsTag,
  modulesTag,
  commentsTag,
  slidesTag,
  investmentOpportunitiesTag,
} = require("./utils/swaggerTags");

// ********************
const app = express();

const swaggerDocument = require("./swagger-output.json");
const upload = require("./utils/upload");
const getUrl = require("./utils/cloudinary_upload");
const { successResponse, errorResponse } = require("./utils/responses");
const investmentapplication = require("./models/investmentapplication");
app.use("/files", express.static("files"));
app.use(cors());
app.use(express.json());
app.use(bodyParser.text({ type: "/" }));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use("/user", usersTag, UserRoutes);
app.use(
  "/investment-applications",
  investmentApplicationTag,
  InvestmentApplicationRoutes
);
app.use(
  "/mentorship-applications",
  mentorshipApplicationsTag,
  MentorshipApplicationRoutes
);
app.use("/user", usersTag, UserRoutes);
app.use("/stats", statsTag, StatsRoutes);
app.use("/notification", notificationsTag, NotificationRoutes);
app.use("/role", rolesTag, RoleRoutes);
app.use("/modules", modulesTag, ModulesRoutes);
app.use("/comments", commentsTag, CommentsRoutes);
app.use("/slides", slidesTag, SlidesRoutes);
app.use("/staff-profile", staffProfileTag, StaffProfileRoutes);
app.use(
  "/investment-opportunities",
  investmentOpportunitiesTag,
  InvestmentOpportunities
);
app.use("/mentor-profile", mentorProfileTag, MentorProfileRoutes);
app.use("/permission", permissionsTag, PermissionRoutes);
app.use("/user_role", userRolesTag, UserRoleRoutes);
app.use("/user_permission", userPermissionsTag, UserPermissionRoutes);
app.use("/application", applicationsTag, ApplicationRoutes);
app.use("/application_review", applicationReviewsTag, ApplicationReviewRoutes);
app.use("/attachment", attachmentsTag, AttachmentRoutes);
app.use("/business", businessDocumentsTag, BusinessRoutes);
app.use("/business_review", businessReviewsTag, BusinessReviewRoutes);
app.use(
  "/mentor-entreprenuers",
  mentorEntrepreneursTag,
  MentorEntreprenuerRoutes
);
app.use("/mentor-reports", mentorReportsTag, MentorReportRoutes);
app.use("/programs", programsTag, ProgramRoutes);
app.use("/investor_profile", investorProfilesTag, InvestorProfileRoutes);
app.use("/conversation", conversationsTag, ConversationRoutes);
app.use("/pitch_material", pitchMaterialsTag, PitchMaterialRoutes);
app.use(
  "/business_investment_request",
  businessInvestmentRequestsTag,
  BusinessInvestmentRequestRoutes
);
app.use(
  "/business_investment_request_review",
  businessInvestmentRequestReviewsTag,
  BusinessInvestmentRequestReviewRoutes
);
app.use("/business_document", businessDocumentsTag, BusinessDocumentRoutes);
app.use("/log", logsTag, LogRoutes);
app.use(
  "/investment_interest",
  investmentInterestsTag,
  InvestmentInterestRoutes
);
app.use("/success-stories", successStoriesTag, SuccessStoryRoutes);
app.use("/product", productsTag, ProductRoutes);
app.use("/order", ordersTag, OrderRoutes);
app.use("/wishlist", wishlistsTag, WishlistRoutes);
app.use("/sector", sectorsTag, BusinessSectors);
app.use("/review", reviewsTag, Reviews);
app.use("/favourite", favouritesTag, Favourites);
app.use("/promotion", promotionsTag, Promotions);
app.use("/payment", paymentsTag, Payments);
app.use("/admin", adminTag, Admin);
app.use("/seller", sellersTag, Seller);
app.use("/subscription", subscriptionsTag, Subscription);
app.use("/crat_market", cratMarketTag, CratMarketRoutes);
app.use("/crat_financial", cratFinancialTag, CratFinancialRoutes);
app.use("/crat_legal", cratLegalTag, CratLegalRoutes);
app.use("/crat_operation", cratOperationsTag, CratOperationRoutes);
app.use("/crat_general", cratGeneralTag, CratGeneralRoutes);
app.use("/reviewer", reviewsTag, CratReviewerRoutes);

app.post("/upload-file", upload.single("file"), async (req, res) => {
  try {
    const url = await getUrl(req);
    successResponse(res, url);
  } catch (error) {
    errorResponse(res, error);
  }
});
app.get("/", (req, res) => {
  res.send("Anza management system API's are okay!");
});

app.listen(5000, () => {
  console.log("Server started at port 5000");
});
