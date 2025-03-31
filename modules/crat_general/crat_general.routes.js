const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { getReportData, scoreCalculation, publishReport } = require('./crat_general.controller');
const upload = require('../../utils/upload');

const router = Router()
//router.post("/create",validateJWT,createFinancial)
router.get('/report',validateJWT,getReportData)
router.get('/score_calculation',validateJWT,scoreCalculation)
router.post('/publish_report',validateJWT,publishReport)

module.exports = router