const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { createProgramApplicationReview, updateProgramApplicationReview, deleteProgramApplicationReview, getUserProgramApplicationReview, getAllProgramApplicationReviews, getReviewersStatus,
getBfaProgramApplicationReviews,getIraProgramApplicationReviews,getProgramApplicationReviewDetails } = require('./program_application_review.controller');

const router = Router()
router.post("/",createProgramApplicationReview)
router.get('/user',validateJWT,getUserProgramApplicationReview)
// business UUID
// ret reviewers,status()
router.get('/reviewers/:uuid',validateJWT,getReviewersStatus)
router.get('/',validateJWT,getAllProgramApplicationReviews)
router.get('/bfa',validateJWT,getBfaProgramApplicationReviews)
router.get('/ira',validateJWT,getIraProgramApplicationReviews)
router.get('/:uuid',validateJWT,getProgramApplicationReviewDetails)
router.patch('/:uuid',validateJWT,updateProgramApplicationReview)
router.delete('/:uuid',validateJWT,deleteProgramApplicationReview)
// router.delete('ProgramApplicationReview_requirement/:uuid',validateJWT,deleteProgramApplicationReviewRequirement)

module.exports = router