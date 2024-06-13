const {Router} = require('express')
const upload = require("../../utils/upload");
const { validateJWT } = require("../../utils/validateJWT")
const { createSuccessStory, updateSuccessStory, deleteSuccessStory, getUserSuccessStory, getAllSuccessStorys,
getSuccessStoryDetails, } = require('./success_story.controller');

const router = Router()
router.post("/",upload.single('file'),createSuccessStory)
// router.post("/",validateJWT,createSuccessStory)
router.get('/user',validateJWT,getUserSuccessStory)
// business UUID
// ret reviewers,status()
router.get('/',validateJWT,getAllSuccessStorys)
router.get('/:uuid',validateJWT,getSuccessStoryDetails)
router.patch('/:uuid',validateJWT,updateSuccessStory)
router.delete('/:uuid',validateJWT,deleteSuccessStory)


module.exports = router