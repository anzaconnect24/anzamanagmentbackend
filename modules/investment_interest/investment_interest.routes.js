const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { createInvestmentInterest, updateInvestmentInterest, deleteInvestmentInterest, getUserInvestmentInterest, getAllInvestmentInterests,
getInvestmentInterestDetails, } = require('./investment_interest.controller');

const router = Router()
router.post("/",validateJWT,createInvestmentInterest)
router.get('/user',validateJWT,getUserInvestmentInterest)
// business UUID
// ret reviewers,status()
router.get('/',validateJWT,getAllInvestmentInterests)
router.get('/:uuid',validateJWT,getInvestmentInterestDetails)
router.patch('/:uuid',validateJWT,updateInvestmentInterest)
router.delete('/:uuid',validateJWT,deleteInvestmentInterest)


module.exports = router