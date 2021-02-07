const router = require('express').Router();

const autController = require('../controllers/auth');
const {check, body} = require('express-validator');
const User = require('../models/user');

router.get('/login', autController.getLogin);

router.post('/login',[
    body('email')
        .isEmail()
        .withMessage('Please enter a valid email address')
        .normalizeEmail(),
    body('password', 'password has to be valid')
        .isLength({min : 6})
        .isAlphanumeric()
        .trim()
], autController.postLogin);

router.get('/signup', autController.getSignup);

router.post('/signup', 
        [
            body('name')
                .notEmpty()
                .withMessage('Name field should not be empty')
                .trim(),
            check('email')
                .isEmail()
                .withMessage('Please enter a valid email')
                .custom((value, {req}) => {
                    // if(value === 'test@test.com'){
                    //     throw new Error('This is generated using custom validator')
                    // }
                    // return true
                    return User.findOne({email: value})
                        .then(userDoc => {
                            if(userDoc){
                                console.log(userDoc)
                                return Promise.reject('Email exists already.')
                            }
                    })
                })
                .normalizeEmail(),
            body('password', 'Password should be 6 letter and alphanumeric value')
                .isLength({min: 6})
                .isAlphanumeric()
                .trim(),
            body('confirmPassword')
                .trim()
                .custom((value, { req }) => {
                if(value !== req.body.password){
                    throw new Error('Password have to match');
                }
                return true;
            })
        ], 
        autController.postSignup);

router.post('/logout', autController.postLogout);

router.get('/reset', autController.getReset);

router.post('/reset', autController.postReset);

router.get('/reset/:token', autController.getNewPassword);

router.post('/new-password', autController.postNewPassword);

module.exports = router;