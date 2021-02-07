const User = require('../models/user');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { check, validationResult} = require('express-validator');

const transporter = nodemailer.createTransport({
    host: "smtp.mailtrap.io",
    port: 2525,
    auth: {
        user: "faafb438de3def",
        pass: "c23242bb8cd621"
    }
  });


exports.getLogin = (req, res, next) => {
    // console.log(req.get('Cookie').split(' ')[1].trim().split('=')[1])
    // if(req.get('Cookie').split(' ') > 1){
        // }
    // const isLoggedIn = req.get('Cookie').split(' ')[1].trim().split('=')[1];
    let message = req.flash('error');
    if(message.length > 0){
        message = message[0];
    }else{
        message = null
    }
    res.render('auth/login', {
        path: '/login',
        pageTitle: 'login',
        errorMessage: message,
        oldInput: {email: '', password: ''},
        validationError: []
    })
}

exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(402).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: errors.array()[0],
            oldInput: {email: email, password: password},
            validationError: errors.array()
        })
    }

    User.findOne({email: email})
        .then(user => {
            if(!user){
                console.log('email',errors.array())
                return res.status(402).render('auth/login', {
                    path: '/login',
                    pageTitle: 'Login',
                    errorMessage: 'Email doesnot exists',
                    oldInput: {email: email, password: password},
                    validationError: errors.array()
                })
            }
            bcrypt.compare(password, user.password)
                .then((doMatch)=>{
                    if(doMatch){
                        req.session.isLoggedIn = true;
                        req.session.user = user;
                        return req.session.save(err => {
                            console.log(err);
                            res.redirect('/');
                        })
                    }
                    console.log('password',errors.array())
                    return res.status(402).render('auth/login', {
                        path: '/login',
                        pageTitle: 'Login',
                        errorMessage: 'Invalid email or password',
                        oldInput: {email: email, password: password},
                        validationError: errors.array()
                    })
                })
                .catch(err => {
                    const error = new Error(err);
                    error.httpStatusCode = 500;
                    return next(error);
                })
        })
    // res.setHeader('Set-Cookie', 'loggedIn=true');
    // User.findById('5e955e555d041d28fcf7371f')
    //     .then(user => {
    //         req.session.isLoggedIn = true;
    //         req.session.user = user;
    //         req.session.save(err => {
    //             console.log(err);
    //             res.redirect('/');
    //         })
    //     })
    //     .catch(err => console.log(err))
}

exports.getSignup = (req, res, next) => {
    let message = req.flash('error');
    if(message.length > 0){
        message = message[0];
    }else{
        message = null
    }
    res.render('auth/signup', {
        path: '/signup',
        pageTitle: 'Signup',
        errorMessage: message,
        oldInput: {name: '', email: '', password: '', confirmPassword: ''},
        validationError: []
    })
}

exports.postSignup = (req, res, next) => {
    const email = req.body.email;
    const name = req.body.name;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;
    const errors = validationResult(req);

    if(!errors.isEmpty()){
        console.log(errors.array())
        return res.status(402).render('auth/signup', {
            path: '/signup',
            pageTitle: 'Signup',
            errorMessage: errors.array()[0],
            oldInput: {
                email: email, 
                name: name, 
                password:password, 
                confirmPassword: confirmPassword
            },
            validationError: errors.array()
        })
    }

    bcrypt
        .hash(password, 12)
        .then(hashedPassword => {
            const user = new User({
                name: name,
                email: email,
                password: hashedPassword
            })
            return user.save();
        })
        .then(result => {
            res.redirect('/login');
            // if there is large app then it might slow app then node cron is used for sending mail
            return transporter.sendMail({
                from: 'test@test.com',
                to: email,
                subject: "Email Test",
                html: `<h2>You have successfully signed up from ${email}</h2>`
            });
        })
        .catch((err, info) => {
            if(err){
                console.log(err);
                return next(err);
            }
            console.log("Info: ", info);
            }
        )
}

exports.postLogout = (req, res, next) => {
    req.session.destroy((err) => {
        console.log(err)
        res.redirect('/');
    })
}

exports.getReset = (req, res, next) => {
    let message = req.flash('error');
    if(message.length > 0){
        message = message[0];
    }else{
        message = null
    }
    res.render('auth/reset', {
        path: '/reset',
        pageTitle: 'reset',
        errorMessage: message
    })
}

exports.postReset = (req, res, next) => {

    crypto.randomBytes(32, (err ,buffer) => {
        if(err){
            req.flash('error', 'erorr while creating token.');
            console.log('crypto err', err);
            return res.redirect('/');
        }
        const token = buffer.toString('hex');
        User.findOne({email: req.body.email})
            .then(user => {
                if(!user){
                    req.flash('error', 'Email id not found');
                    return res.redirect('/reset');
                }
                user.resetToken = token;
                user.resetTokenExpiration = Date.now() + 1200;
                return user.save()
            })
            .then(result => {
                res.redirect('/');
                transporter.sendMail({
                    from: 'test@test.com',
                    to: req.body.email,
                    subject: "Reset password",
                    html: `
                        <h2>Reset password link</h2>
                        <p>Click this to reset password <a href="http://localhost:5000/reset/${token}">reset password link</a></p>
                    `
                });
            })
            .catch(err => {
                const error = new Error(err);
                error.httpStatusCode = 500;
                return next(error);
            })
    })
}


exports.getNewPassword = (req, res, next) => {
    const token = req.params.token;

    User.findOne({resetToken: token})
    // resetTokenExpiration: {$gt: Date.now()} this logic is not working
        .then(user => {
            // console.log(user, {$gt: Date.now()})
            let message = req.flash('error');
            if(message.length > 0){
                message = message[0];
            }else{
                message = null
            }
            res.render('auth/new-password', {
                path: '/new-password',
                pageTitle: 'new-password',
                errorMessage: message,
                userId: user._id.toString(),
                passwordToken: token
            })
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        })

}

exports.postNewPassword = (req, res, next) => {
    const newPassword = req.body.password;
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;
    let resetUser;

    // User.findOne({resetToken: passwordToken, _id: userId, resetTokenExpiration: {$gt: Date.now()}}) not working
    User.findOne({resetToken: passwordToken, _id: userId})
        .then(user => {
            resetUser = user;
            return bcrypt.hash(newPassword, 12)
        }) 
        .then(hashedPassword => {
            resetUser.password = hashedPassword;
            resetUser.resetToken = undefined,
            resetUser.resetTokenExpiration = undefined
            return resetUser.save();
        })
        .then(result => {
            transporter.sendMail({
                from: 'test@test.com',
                to: resetUser.email,
                subject: "succesfully password reset",
                html: `<h2>Congratulation, your password reset Succesfully</h2>`
            });
            res.redirect('/login')
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        })

}