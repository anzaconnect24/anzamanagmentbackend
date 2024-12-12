const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const { getApplicationData, getReportDataById, updateSubDomainData, reviewerPublish} = require('./crat_reviewer.controller');
const upload = require('../../utils/upload');

const router = Router()
//router.post("/create",validateJWT,createFinancial)
router.get('/getCratApplications',validateJWT,getApplicationData)
router.post('/get_report_byId',validateJWT,getReportDataById)
router.post('/update',validateJWT,updateSubDomainData)
router.post("/publish",upload.single('file'), reviewerPublish)




module.exports = router