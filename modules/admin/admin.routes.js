const {Router} = require("express")
const { validateJWT } = require("../../utils/validateJWT")
const router = Router()
const upload = require("../../utils/upload");
const {getAllUsers,getAllCustomers,getAllSellers,getAllAdmins,getUserCounts } = require("./admin.controller");

router.get("/customers",validateJWT,getAllCustomers)
router.get("/sellers",validateJWT,getAllSellers)
router.get("/admins",validateJWT,getAllAdmins)
router.get("/dashboard",validateJWT,getUserCounts)
router.get("/",validateJWT,getAllUsers)

module.exports = router