const mongodb = require('mongodb');
const Product = require('../models/product');
const mongoose = require('mongoose');
// const {validationResult} = require('express-validator');
const fileHelper = require('../util/file');

exports.getAddProduct = (req, res, next) => {
    res.render('admin/add-product',{
        pageTitle: "add product",
        path: 'admin/add-product',
        editing: true,
        product: true,
        hasError: false,
        errorMessage: null
    });
};

exports.postAddProduct =  (req, res, next) => {
    const title = req.body.title;
    const image = req.file;
    const price = req.body.price;
    const description = req.body.description;
    // console.log(image)
    // const errors = validationResult(req)
    // console.log(errors.array())
    // if(!errors.isEmpty()){
    //     return res.status(422).render('admin/add-product',{
    //         pageTitle: "Add product",
    //         path: 'admin/add-product',
    //         hasError: true,
    //         editing: false,
    //         product: {
    //             title: title,
    //             imageUrl: imageUrl,
    //             price: price,
    //             description: description
    //         },
    //         errorMessage: errors.array()[0].msg
    //     });
    // }

    if(!image){
        return res.status(422).render('admin/add-product',{
                pageTitle: "add product",
                path: 'admin/add-product',
                editing: true,
                product: true,
                hasError: false,
                product: {title: title, price: price, description: description},
                errorMessage: 'Attach file is not a image'
            });
    }

    const product = new Product({
        // _id: mongoose.Types.ObjectId('5e9577a26eec6a08680a271b'), //for creating error
        title: title, 
        imageUrl: image.path, 
        price: price, 
        description: description,
        userId: req.user // same as req.user._id
    });
    product
        .save()
        .then(result => {
            // console.log(result);
            console.log('product created')
            res.redirect('/')
        })
        .catch(err => {
            // res.status(500).render('admin/add-product',{
            //     pageTitle: "add product",
            //     path: 'admin/add-product',
            //     editing: true,
            //     product: true,
            //     hasError: false,
            //     product: {title: title, imageUrl: imageUrl, price: price, description: description},
            //     errorMessage: 'Database operation failed, plaese try again.'
            // });

            // return res.redirect('/500')
            console.log('post',err)
            // const error = new Error(err);
            // error.httpStatusCode = 500;
            // return next(error);
        })
};

exports.getEditProduct = (req, res, next) => {
    const editMode = req.query.edit;
    if(!editMode){
        return res.redirect('/');
    }

    const prodId = req.params.productId;
    Product.findById(prodId)
            .then(product => {
                if(!product){
                    return res.redirect('/');
                }
                res.render('admin/edit-product',{
                    pageTitle: "edit product",
                    path: 'admin/edit-product',
                    editing: editMode,
                    product: product,
                    hasError: false,
                    errorMessage: null
                });
            })
            .catch(err => {
                const error = new Error(err);
                error.httpStatusCode = 500;
                return next(error);
            })
};

exports.postEditProduct = (req, res, next) => {
    const prodId = req.body.productId;
    const updatedTitle = req.body.title;
    const updatedPrice = req.body.price;
    const image = req.file;
    const updatedDesc = req.body.description;

    Product.findById(prodId).then(product => {
        if(product.userId.toString() !== req.user._id.toString()){
            return res.redirect('/');
        }
        product.title = updatedTitle;
        // console.log(product.title, image);
        if(image){
            // fileHelper.deleteFile(product.imageUrl);
            product.imageUrl = image.path;
        }
        product.price = updatedPrice;
        product.description = updatedDesc;
        return product.save()
        .then(result => {
            console.log('updated product');
            res.redirect('/admin/products');
        })
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    })
};

exports.getProducts = (req, res, next) => {
    Product.find({userId: req.user._id})
        // .select('title, price -_id')
        // .populate('userId', 'name')
        .then(products => {
            // console.log(products, req.user._id)
            res.render('admin/products', { 
                prods: products, 
                pageTitle: 'admin products',
                path: 'admin/products',
            })
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        })
};


exports.deleteProduct = (req, res, next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then(product => {
        if(!product){
            return next(new Error('Product not found !'))
        }
        // fileHelper.deleteFile(product.imageUrl);
        return Product.deleteOne({_id: prodId, userId: req.user._id});
        })
        .then(() => {
            console.log('deleted product')
            res.status(200).json({ message: 'deleted succesfully' });
        })
        .catch(err => {
            res.status(500).json({ message: 'deleting product failed' });
        })
}
