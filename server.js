var express = require('express')
var bodyParser = require('body-parser')
var app = express()
var hbs = require('handlebars')
var request = require('request');
var http = require('http');
var https = require('https');
var mongodb = require('mongodb')
var MongoClient = mongodb.MongoClient
var OjbectID = mongodb.ObjectID
var db;
var config = require('./config')
var dbConnection = config.dbConfig;
var server = http.createServer(app);
var secureserver = https.createServer(app);
var flash = require('connect-flash');
var uploadFileImage = require('jquery-file-upload-middleware');
var serveStatic = require('serve-static')

var handlebars = require('express-handlebars').create({ defaultLayout: 'main', extname: '.html' })
app.engine('html', handlebars.engine)
app.set('view engine', 'html')

var getCurTime = function () {
    return new Date();
}

app.use(bodyParser.urlencoded({ extended: true }))

MongoClient.connect(dbConnection, { useUnifiedTopology: true }, (err, database) => {
    if (err) return console.log("DB Connection String Errror", Date.now(), "\n", err)
    console.log("NO---->")
    db = database.db(config.dbname);

    server.listen(80, function () {
        console.log("server listening to 80 port")
    })

})
var session = require('express-session');
var FileStore = require('session-file-store')(session);
var mainFileSessionStore = new FileStore()
var passport = require('passport');


app.use(require('express-session')({
    store: mainFileSessionStore,
    secret: 'mynodedemo',
    resave: false,
    saveUninitialized: false,
    cookie: {
        path: '/',
        httpOnly: true,
        secure: false,
        maxAge: 10 * 24 * 60 * 60 * 1000
    }
}));
var LocalStrategy = require('passport-local').Strategy;
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

passport.serializeUser(function (user, done) {
    done(null, user);
})

passport.deserializeUser(function (user, done) {
    done(null, user);
})

passport.use(new LocalStrategy({
    usernameField: 'username', passwordField: 'password',
    passReqToCallback: true
}, function (req, username, password, done) {
    process.nextTick(function () {
        db.collection('login').find({ $or: [{ "email": username }, { "username": username }], "password": password }).count().then(function (numItems) {
            console.log("numItems numItems", numItems)
            if (numItems == 1) {
                db.collection('login').find({ $or: [{ "email": username }, { "username": username }] }).toArray(function (err, result) {
                    var profileName = result[0];
                    console.log("Success Case")
                    done(null, profileName)
                })
            } else {
                console.log("Failure Case")
                done(null, false, req.flash('loginMessage', 'Invalid Email/password'))
            }
        })
    })
}))

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        logreq(req)
        return next();
    } else {
        logreq(req)
        res.redirect('/login')
    }
}

function isLoggedOut(req, res, next) {
    if (!req.isAuthenticated())
        return next();
    res.redirect('/');
}

function logreq(req, res) {
    if (config.enablelog == 1) {
        if (req.user) {
            var doc = { updTime: getCurTime(), "type": "Request", "path": req.path, "query": req.query, "body": req.body, "header": req.header, "user": req.user }
            db.collection('LogReq').insert(doc, { w: 1 }, function (err, result) {
                if (err) {
                    return
                }
            })
        }
    }
}

app.use("/assets", serveStatic(__dirname + '/assets/'))

uploadFileImage.configure({
    uploadDir: __dirname + '/assets/images',
    uploadUrl: '/assets/images',
    imageTypes: /\.(jpg|png)$/i,
    acceptFileTypes: /\.(jpg|png)$/i,
    maxNumberOfFiles: 1
});

app.use('/imageFileUpload', uploadFileImage.fileHandler());

app.get('/', function (req, res) {
    console.log("Welcome to Cart List Home Page")
    var passData = {}
    passData.layout = false
    db.collection('products').find({}).toArray(function (err, result) {
        if (err) {
            return err
        }
        passData.url = result[0].fileUrl
        passData.name = result[0].productname
        passData.price = result[0].price
        passData.pname = result[0].fileName
        passData.quantity = result[0].quantity
        var xprodcuts = []
        let prodlist = {}
        if (result && result[0]) {
            for (var i = 0; i < result.length; i++) {
                prodlist.name = result[i].productname
                prodlist.price = result[i].price
                prodlist.pname = result[i].fileName
                prodlist.url = result[i].fileUrl
                prodlist.quantity = result[i].quantity
                xprodcuts.push(prodlist)
            }
        }
        passData.xprodcuts = xprodcuts
        console.log("products \n", JSON.stringify(passData))
    })
    res.render("cartlist", passData)
})


app.get('/register', function (req, res) {
    console.log("Welcome to Register Page")
    var passData = {}
    passData.layout = false
    res.render("register", passData)
})

app.get('/register_new', function (req, res) {
    console.log("Welcome to Register Page")
    var passData = {}
    passData.layout = false
    res.render("register_new", passData)
})

app.get('/login', isLoggedOut, function (req, res) {
    console.log("LogIn Page REquest....", req.flash('loginMessage'))
    res.render('login', { layout: false, message: req.flash('loginMessage') })
});


app.post('/login', passport.authenticate('local', { successRedirect: '/login', failureRedirect: '/', failureFlash: true }));


app.post('/register', function (req, res) {
    console.log("\n Connected register Post METHOD \n", req.body)
    var date = new Date();
    var passData = {}
    console.log("REEERW", req.body)
    let doc1 = {}
    doc1.email = req.body.email
    doc1.username = req.body.username
    doc1.country = req.body.country
    doc1.password = req.body.password
    if (req.body.country) {
        if (req.body.country == "usa") {
            doc1.countryCode = "USA"
            doc1.country = "United States Of America"
        }
        if (req.body.country == "uk") {
            doc1.countryCode = "UK"
            doc1.country = "United Kingdom"
        }
        if (req.body.country == "in") {
            doc1.countryCode = "IN"
            doc1.country = "India"
        }
        if (req.body.country == "gr") {
            doc1.countryCode = "GR"
            doc1.country = "Germany"
        }
        if (req.body.country == "ag") {
            doc1.countryCode = "AG"
            doc1.country = "Argentina"
        }
    }
    doc1.Time = date;
    doc1.updTime = getCurTime();
    if (req.body.email != "" && req.body.email != null) {
        db.collection('login').find({ "email": req.body.email }).toArray(function (err, resultObj) {
            if (err) {
                console.log("Error", Date.now())
            }
            console.log("resultObj", resultObj[0])
            if (resultObj && resultObj[0]) {
                if (resultObj[0].email == req.body.email) {
                    res.send("User already Exists. Please try with some other Credentials")
                }
            } else {
                db.collection('login').insertOne(doc1, { w: 1 }, function (err, result) {
                    if (err) {
                        console.log(Date.now(), err)
                    }
                    console.log('Success', result[0])
                    res.redirect('/register')
                })
            }
        })
    } else {
        passData.error = "failure"
        passData.message = "Please fill the required form fields.."
        res.render('register', { layout: false, message: "Please fill the required form fields.." })
    }
})

app.get('/addProducts', isLoggedIn, function (req, res) {
    console.log("addProducts Page REquest....")
    var passData = {}
    passData.layout = false
    res.render("products", passData)
});

app.post('/addProducts', isLoggedIn, function (req, res) {
    console.log("\n addProducts Post METHOD \n", req.body)
    var date = new Date();
    var passData = {}
    let prodcut_doc = {}
    prodcut_doc.productname = req.body.pname
    prodcut_doc.price = parseInt(req.body.price)
    prodcut_doc.quantity = parseInt(req.body.quantity)
    prodcut_doc.fileName = req.body.fileupload
    prodcut_doc.fileUrl = (req.body.fileupload ? req.body.fileupload : "")
    prodcut_doc.Time = date;
    prodcut_doc.updTime = getCurTime();
    db.collection('products').insertOne(prodcut_doc, { w: 1 }, function (err, result) {
        if (err) {
            console.log(Date.now(), err)
        }
        console.log('Success', result[0])
        res.redirect("addProducts")
    })
})

app.post('/imageFileUpload2', isLoggedIn, function (req, res) {
    console.log("imageFileUpload2 POST DATA", req.body)
    var file = req.body.data.files[0]
    var baseUrl = ''
    baseUrl = 'http://localhost/assets/images/'
    var urlName = baseUrl + file.name
    db.collection('login').update({ "email": req.user.email }, { $set: { updTime: getCurTime(), productimg: urlName } }, function (err, result) {
        req.user.productimg = urlName;
        res.send(urlName)
    });
});

app.post('/saveCartData', isLoggedIn, function (req, res) {
    console.log("\n addProducts Post METHOD \n", req.body)
    var date = new Date();
    var passData = {}
    let prodcut_doc = {}
    prodcut_doc.productname = req.body.pname
    prodcut_doc.price = parseInt(req.body.price)
    prodcut_doc.quantity = parseInt(req.body.quantity)
    prodcut_doc.fileName = req.body.fileupload
    prodcut_doc.fileUrl = (req.body.fileupload ? req.body.fileupload : "")
    prodcut_doc.Time = date;
    prodcut_doc.updTime = getCurTime();
    db.collection("userproducts").update({ "email": req.user.email }, { $set: prodcut_doc }, { upsert: true }, function (err, result) {
        if (err) {
            console.log(Date.now(), err)
        }
        console.log('Success')
        res.redirect("/")
    })
})


