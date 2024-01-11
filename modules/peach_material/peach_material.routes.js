const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const upload = require("../../utils/upload");
const { createPeachMaterial, updatePeachMaterial, deletePeachMaterial, getUserPeachMaterial, getAllPeachMaterials, getReviewersStatus,
getWaitingPeachMaterials,getAcceptedPeachMaterials,getRejectedPeachMaterials,getPeachMaterialDetails,postPeachMaterialDocument } = require('./peach_material.controller');

const router = Router()
router.post("/",upload.single('file'),validateJWT,createPeachMaterial)
router.post("/document/:uuid",upload.single('file'),validateJWT,postPeachMaterialDocument)
router.get('/user',validateJWT,getUserPeachMaterial)
// business UUID
// ret reviewers,status()
router.get('/reviewers/:uuid',validateJWT,getReviewersStatus)
router.get('/',validateJWT,getAllPeachMaterials)
router.get('/waiting',validateJWT,getWaitingPeachMaterials)
router.get('/accepted',validateJWT,getAcceptedPeachMaterials)
router.get('/rejected',validateJWT,getRejectedPeachMaterials)
router.get('/:uuid',validateJWT,getPeachMaterialDetails)
router.patch('/:uuid',validateJWT,updatePeachMaterial)
router.delete('/:uuid',validateJWT,deletePeachMaterial)
// router.delete('PeachMaterial_requirement/:uuid',validateJWT,deletePeachMaterialRequirement)

module.exports = router