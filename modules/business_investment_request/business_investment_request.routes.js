const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const upload = require("../../utils/upload");
const { createBusinessInvestmentRequest, updateBusinessInvestmentRequest, deleteBusinessInvestmentRequest, getUserBusinessInvestmentRequest, 
getAllBusinessInvestmentRequests, getReviewersStatus, getWaitingBusinessInvestmentRequests,getAcceptedBusinessInvestmentRequests,
getRejectedBusinessInvestmentRequests,getBusinessInvestmentRequestDetails,postBusinessInvestmentRequestDocument } = require('./business_investment_request.controller');

const router = Router()
router.post("/",validateJWT,createBusinessInvestmentRequest)
router.post("/document/:uuid",upload.single('file'),validateJWT,postBusinessInvestmentRequestDocument)
router.get('/user/:uuid',validateJWT,getUserBusinessInvestmentRequest)
// business UUID
// ret reviewers,status()
router.get('/reviewers/:uuid',validateJWT,getReviewersStatus)
router.get('/',validateJWT,getAllBusinessInvestmentRequests)
router.get('/waiting',validateJWT,getWaitingBusinessInvestmentRequests)
router.get('/accepted',validateJWT,getAcceptedBusinessInvestmentRequests)
router.get('/rejected',validateJWT,getRejectedBusinessInvestmentRequests)
router.get('/:uuid',validateJWT,getBusinessInvestmentRequestDetails)
router.patch('/:uuid',validateJWT,updateBusinessInvestmentRequest)
router.delete('/:uuid',validateJWT,deleteBusinessInvestmentRequest)

module.exports = router