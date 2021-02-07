const express = require('express');
const router = express.Router();
const path = require('path');
const { check, body } = require('express-validator')

const isAuth = require('../middleware/is-auth');

const adminController = require('../controllers/admin');

// /admin/add-product => show add product page => GET
router.get('/add-product', isAuth, adminController.getAddProduct);

// /admin/add-product => insert add product page => POST
router.post('/add-product', isAuth, adminController.postAddProduct);

router.get('/products', isAuth, adminController.getProducts);

router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);

router.post('/edit-product', isAuth, adminController.postEditProduct);

router.delete('/product/:productId', isAuth, adminController.deleteProduct);

module.exports = router;