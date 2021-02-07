const fs = require('fs');
const path = require('path');

const PDFDocument = require('pdfkit');

const Product = require('../models/product');
const Order = require('../models/order');

const stripe = require('stripe')(process.env.STRIPE_KEY);


const ITEMS_PER_PAGE = 3;

exports.getProducts = (req, res, next) => {
    const page = +req.query.page || 1;
    let totalItems; 

    Product
        .find()
        .countDocuments()
        .then(numProduct => {
            totalItems = numProduct;
            return  Product.find()
                        .skip((page - 1) * ITEMS_PER_PAGE)
                        .limit(ITEMS_PER_PAGE)
        })
        .then(products => {
            res.render('shop/product-list', { 
                prods: products, 
                pageTitle: 'Products',
                path: '/products',
                currentPage: page,
                hasNextPage: ITEMS_PER_PAGE * page < totalItems,
                hasPreviousPage: page > 1,
                nextPage: page + 1,
                previousPage: page - 1,
                lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
            });
            })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        }) 
};

exports.getProduct = (req, res, next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
            .then(product => {
                res.render('shop/product-detail', {
                    product: product,
                    pageTitle: product.title, 
                    path: '/products',
                })
            })
            .catch(err => {
                const error = new Error(err);
                error.httpStatusCode = 500;
                return next(error);
            })
}

exports.getIndex = (req, res, next) => {
    const page = +req.query.page || 1;
    let totalItems; 

    Product
        .find()
        .countDocuments()
        .then(numProduct => {
            totalItems = numProduct;
            return  Product.find()
                        .skip((page - 1) * ITEMS_PER_PAGE)
                        .limit(ITEMS_PER_PAGE)
        })
        .then(products => {
            res.render('shop/index', { 
                prods: products, 
                pageTitle: 'Shop',
                path: '/',
                currentPage: page,
                hasNextPage: ITEMS_PER_PAGE * page < totalItems,
                hasPreviousPage: page > 1,
                nextPage: page + 1,
                previousPage: page - 1,
                lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
            });
            })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        }) 
};

exports.getCart = (req, res, next) => {
    // console.log(req.user.cart.items.productId)
    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then(user => {
            const products = user.cart.items;
            console.log(products)
            res.render('shop/cart', {
                pageTitle: 'Your cart',
                path: '/cart',
                products: products,
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        })
};

exports.postCart = (req, res, next) => {
    const prodId = req.body.productId;
    Product.findById(prodId)
            .then(product => {
                return req.user.addToCart(product);
            })
            .then(result => {
                console.log(result);
                res.redirect('/cart');
            })
            .catch(err => {
                const error = new Error(err);
                error.httpStatusCode = 500;
                return next(error);
            })
};

exports.postCartDeleteProduct = (req, res, next) => {
    const prodId = req.body.productId;
    req.user.removeFromCart(prodId)  
            .then(() => {
                console.log('deleted cart')
                res.redirect('/cart');
            })
            .catch(err => {
                const error = new Error(err);
                error.httpStatusCode = 500;
                return next(error);
            })
}


exports.getCheckout = (req, res, next) => {
    req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
        let total = 0;
        const products = user.cart.items;
        products.forEach(p => {
            total += p.quantity * p.productId.price;
        })
        console.log(total, user, products)
        res.render('shop/checkout', {
            pageTitle: 'Checkout',
            path: '/checkout',
            products: products,
            totalSum: total
        });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    })
};

exports.postOrder = (req, res, next) => {
    const token = req.body.stripeToken;
    let totalSum = 0;

    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then(user => {
            // console.log(user) // here it have full data bt not refelecting so _doc is used
            
            user.cart.items.forEach(p => {
                totalSum += p.quantity * p.productId.price
            })

            const products = user.cart.items.map(i => {
                return {quantity: i.quantity, product: {...i.productId._doc}}
            })
            const order = new Order({
                user: {
                    name: req.user.name,
                    email: req.user.email,
                    userId: req.user
                },
                products: products
            })
            return order.save();
        })
        .then(result => {
            const charge = stripe.charges.create({
                amount: totalSum * 100,
                currency: 'inr',
                description: 'demo order',
                source: token,
                metadata: {order_id: result._id.toString()}
            });
            return req.user.clearCart();
        })
        .then(result => {
            res.redirect('/orders');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        })
}

exports.getOrders = (req, res, next) => {
    Order.find({"user.userId": req.user._id})
        .then(orders => {
            res.render('shop/orders', {
                pageTitle: 'Your orders',
                path: '/orders',
                orders: orders,
            });
        })
};

exports.getInvoice = (req, res, next) => {
    const orderId = req.params.orderId;
    Order.findById(orderId).then(order => {
        if(!order){
            return next(new Error('No order found'))
        }
        if(order.user.userId.toString() !== req.user._id.toString()){
            return next(new Error('unauthorized'))
        }
        const invoiceName = 'invoice-' + orderId + '.pdf';
        const invoicePath = path.join('data', 'invoices', invoiceName);

        const pdfDoc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"');
        pdfDoc.pipe(fs.createWriteStream(invoicePath));
        pdfDoc.pipe(res);
        pdfDoc.fontSize(26).text('Invoice', {
            underline: true
        })
        pdfDoc.text('------------------------------------');
        let totalPrice = 0;
        order.products.forEach(prod => {
            totalPrice += prod.quantity * prod.product.price
            pdfDoc.text(prod.product.title + '-' + prod.quantity + ' x ' + ' $ ' + prod.product.price)
        })
        pdfDoc.text('------------------------------------');
        pdfDoc.fontSize(35).text('Total Price : $' + totalPrice);
        pdfDoc.end();

        // fs.readFile(invoicePath, (err ,data) => {
        //     if(err){
        //         // console.log(err)
        //         return next(err);
        //     }
        //     res.setHeader('Content-Type', 'application/pdf');
        //     res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"')
        //     res.send(data);
        // })

        // const file = fs.createReadStream(invoicePath);
        // file.pipe(res);
    })
    .catch(err => next(err))
};
