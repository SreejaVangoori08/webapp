const productController=require('../controller/productController.js')
const router=require('express').Router()


router.post('/',productController.addproduct)

router.put('/:pId',productController.updateproduct)

router.patch('/:pId',productController.patchproduct)

router.delete('/:pId',productController.deleteproduct)

router.get('/:pId',productController.getproduct)

module.exports=router