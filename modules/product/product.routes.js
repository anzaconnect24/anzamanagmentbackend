const { validateJWT } = require("../../utils/validateJWT")
const {Router} = require('express')
const { createProduct, updateProduct, getProduct, getProducts, getFeaturedProducts, getBusinessSectorProducts, getTopRatedProducts, getTopSellingProducts, 
    searchProduct,getSearchedProduct, deleteProduct, BusinessProducts } = require('./product.controller')

const router = Router()
router.post("/:uuid",validateJWT,createProduct)
router.get("/featured",getFeaturedProducts)
router.get("/top_selling",getTopSellingProducts)
router.get("/top_rated",getTopRatedProducts)
router.get("/:uuid",getProduct)
router.patch("/:uuid",validateJWT,updateProduct)
router.get("/business/:uuid",validateJWT,BusinessProducts)
router.get("/",getProducts)
router.get('/business_sector/:uuid',getBusinessSectorProducts)
router.delete('/:uuid',validateJWT,deleteProduct)

router.get("/search/:itemName",searchProduct) //PASS PRODUCT NAME ON URL
router.post("/search/",getSearchedProduct) //PASS PRODUCT UUID IN REQUEST BODY

module.exports = router