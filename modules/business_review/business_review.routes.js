const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { createBusinessReview, updateBusinessReview, deleteBusinessReview, getUserBusinessReview, getAllBusinessReviews, getReviewersStatus } = require('./business_review.controller');

const router = Router()
router.post("/",createBusinessReview)
router.get('/user',validateJWT,getUserBusinessReview)
// business UUID
// ret reviewers,status()
router.get('/reviewers/:uuid',validateJWT,getReviewersStatus)
router.get('/',validateJWT,getAllBusinessReviews)
router.patch('/:uuid',validateJWT,updateBusinessReview)
router.delete('/:uuid',validateJWT,deleteBusinessReview)

module.exports = router