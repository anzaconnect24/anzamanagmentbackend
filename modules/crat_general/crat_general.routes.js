const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { getReportData, scoreCalculation } = require('./crat_general.controller');
const upload = require('../../utils/upload');

const router = Router()
//router.post("/create",validateJWT,createFinancial)
router.get('/report',validateJWT,getReportData)
router.get('/score_calculation',validateJWT,scoreCalculation)

module.exports = router