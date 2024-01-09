const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { createBusinessReview, updateBusinessReview, deleteBusinessReview, getUserBusinessReview, getAllBusinessReviews } = require('./business_review.controller');

const router = Router()
router.post("/",createBusinessReview)
router.get('/user',validateJWT,getUserBusinessReview)
router.get('/',validateJWT,getAllBusinessReviews)
router.patch('/:uuid',validateJWT,updateBusinessReview)
router.delete('/:uuid',validateJWT,deleteBusinessReview)

module.exports = router