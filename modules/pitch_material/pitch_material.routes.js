const {Router} = require('express')
const { validateJWT } = require("../../utils/validateJWT")
const upload = require("../../utils/upload");
const { createPitchMaterial, updatePitchMaterial, deletePitchMaterial, getUserPitchMaterial, getAllPitchMaterials, getReviewersStatus,
getVideoPitchMaterials,getDocumentPitchMaterials,getRejectedPitchMaterials,getPitchMaterialDetails,postPitchMaterialDocument, deletePitchMaterialViewer, addPitchMaterialViewer } = require('./pitch_material.controller');

const router = Router()
router.post("/",validateJWT,createPitchMaterial)
router.post("/document/:uuid",upload.single('file'),validateJWT,postPitchMaterialDocument)
router.get('/user',validateJWT,getUserPitchMaterial)
// business UUID
// ret reviewers,status()

router.get('/',validateJWT,getAllPitchMaterials)
router.get('/video',validateJWT,getVideoPitchMaterials)
router.get('/document',validateJWT,getDocumentPitchMaterials)
router.delete('/viewer/:uuid',validateJWT,deletePitchMaterialViewer)
router.post('/viewer/:uuid',validateJWT,addPitchMaterialViewer)
router.patch('/:uuid',validateJWT,updatePitchMaterial)
router.delete('/:uuid',validateJWT,deletePitchMaterial)




// router.delete('PitchMaterial_requirement/:uuid',validateJWT,deletePitchMaterialRequirement)

module.exports = router