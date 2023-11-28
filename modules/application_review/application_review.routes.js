const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { createApplicationReview, updateApplicationReview, deleteApplicationReview, getUserApplicationReview, getAllApplicationReviews } = require('./application_review.controller');

const router = Router()
router.post("/",validateJWT,createApplicationReview)
router.get('/user',validateJWT,getUserApplicationReview)
router.get('/',validateJWT,getAllApplicationReviews)
router.patch('/:uuid',validateJWT,updateApplicationReview)
router.delete('/:uuid',validateJWT,deleteApplicationReview)

module.exports = router