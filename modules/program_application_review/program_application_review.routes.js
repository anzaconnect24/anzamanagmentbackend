const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { createProgramReview, updateProgramReview, deleteProgramReview, getUserProgramReview, getAllProgramReviews, getReviewersStatus,
getBfaProgramReviews,getIraProgramReviews,getProgramReviewDetails,deleteProgramReviewRequirement } = require('./ProgramReview.controller');

const router = Router()
router.post("/",createProgramReview)
router.get('/user',validateJWT,getUserProgramReview)
// business UUID
// ret reviewers,status()
router.get('/reviewers/:uuid',validateJWT,getReviewersStatus)
router.get('/',validateJWT,getAllProgramReviews)
router.get('/bfa',validateJWT,getBfaProgramReviews)
router.get('/ira',validateJWT,getIraProgramReviews)
router.get('/:uuid',validateJWT,getProgramReviewDetails)
router.patch('/:uuid',validateJWT,updateProgramReview)
router.delete('/:uuid',validateJWT,deleteProgramReview)
router.delete('ProgramReview_requirement/:uuid',validateJWT,deleteProgramReviewRequirement)

module.exports = router