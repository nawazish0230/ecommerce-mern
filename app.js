const fs = require('fs');
const https = require('https');

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoDbStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

// model
const User = require('./models/user');

//db
const mongoose = require('mongoose');

const errorController = require('./controllers/error')
const shopController = require('./controllers/shop'); 

const isAuth = require('./middleware/is-auth');

console.log(process.env.NODE_ENV);

// db link
const MONGO_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0-ul74t.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}`;

const app = express();

// express session
const store = new MongoDbStore({
    uri: MONGO_URI,
    collection: 'sessions'
})

// csrf
const csrfProtection = csrf();

// const privateKey = fs.readFileSync('server.key');
// const certificate = fs.readFileSync('server.cert');

// image storage : multer
const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'image')
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname)
    }
})

const fileFilter = (req, file, cb) => {
    if(file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg'){
        cb(null, true)
    }else{
        cb(null, false)
    }
}

app.set('view engine', 'ejs');
app.set('views', 'views');

//routes
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

const accessLogStream = fs.createWriteStream(
    path.join(__dirname, 'access.log'), 
    { flags: 'a'}
);

app.use(helmet());
app.use(compression());
app.use(morgan('combined', {stream: accessLogStream}))

app.use(bodyParser.urlencoded({extended: false}));
app.use(multer({storage: fileStorage, fileFilter: fileFilter}).single('image'))
app.use(express.static(path.join(__dirname, 'public')));
app.use('/image', express.static(path.join(__dirname, 'image')));

// session middleware
app.use(
    session({
        secret: 'my secret', 
        resave: false, 
        saveUninitialized: false, 
        store: store
    })
);


// flash middleware
app.use(flash());

// authentication
app.use((req, res, next) => {
    res.locals.isAuthenticated = req.session.isLoggedIn;
    next();
});


// middleware for user
app.use((req, res, next) => {
    // throw new Error('err');
    if(!req.session.user){
        return next();
    }
    User.findById(req.session.user._id)
        .then(user => {
            // throw new Error('err');
            if(!user){
                return next();
            }
            req.user = user;
            next()
        })
        .catch(err => {
            // throw new Error(err);
            // next();
            next(new Error(err))
        })
})

// payment routes
app.post('/create-order', isAuth, shopController.postOrder)

// csrf middleware
app.use(csrfProtection);
// csrf middleware
app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
});

// routing
app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

// 500 redirection
app.get('/500', errorController.get500);

// 400 error
app.use(errorController.get404);

// handling catch block throw new Error
app.use((error, req, res, next) => {
    console.log(error)
    console.log(req.session.isLoggedIn)
    res.status(500).render('500', {
        pageTitle: 'Error!' , 
        path: '/500', 
        isAuthenticated: req.session.isLoggedIn
    }); 
})

const port = process.env.PORT || 3000;

mongoose.connect(MONGO_URI, { useNewUrlParser: true , useUnifiedTopology: true })
    .then(result => {
        // https.createServer({key: privateKey, cert: certificate}, app)
        //         .listen(process.env.PORT || 3000);
        app.listen(port, () => {
            console.log('server is running in port ' + port )
        })
    })
    .catch(err => console.log(err))

    // A app in which one can login and signup and can create product and add product to the cart and do checkout and can do payment with stripe also and can see the all products orderered and  invoice in the order product