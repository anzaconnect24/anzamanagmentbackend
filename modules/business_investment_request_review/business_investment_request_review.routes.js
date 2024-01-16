const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { createBusinessInvestmentRequestReview, updateBusinessInvestmentRequestReview, deleteBusinessInvestmentRequestReview, getUserBusinessInvestmentRequestReview, getAllBusinessInvestmentRequestReviews, getReviewersStatus,
getBfaBusinessInvestmentRequestReviews,getIraBusinessInvestmentRequestReviews,getBusinessInvestmentRequestReviewDetails } = require('./business_investment_request_review.controller');

const router = Router()
router.post("/", createBusinessInvestmentRequestReview)
router.get('/user',validateJWT,getUserBusinessInvestmentRequestReview)
// business UUID
// ret reviewers,status()
router.get('/reviewers/:uuid',validateJWT,getReviewersStatus)
router.get('/',validateJWT,getAllBusinessInvestmentRequestReviews)
router.get('/bfa',validateJWT,getBfaBusinessInvestmentRequestReviews)
router.get('/ira',validateJWT,getIraBusinessInvestmentRequestReviews)
router.get('/:uuid',validateJWT,getBusinessInvestmentRequestReviewDetails)
router.patch('/:uuid',validateJWT,updateBusinessInvestmentRequestReview)
router.delete('/:uuid',deleteBusinessInvestmentRequestReview)
// router.delete('BusinessInvestmentRequestReview_requirement/:uuid',validateJWT,deleteBusinessInvestmentRequestReviewRequirement)

module.exports = router