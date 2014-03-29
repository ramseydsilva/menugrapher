/**
 * Module dependencies.
 */

var express = require('express'),
    MongoStore = require('connect-mongo')(express),
    flash = require('express-flash'),
    path = require('path'),
    mongoose = require('mongoose'),
    passport = require('passport'),
    expressValidator = require('express-validator'),
    connectAssets = require('connect-assets');

/**
 * Load controllers.
 */

var homeController = require('./controllers/home'),
    postController = require('./controllers/post'),
    userController = require('./controllers/user'),
    apiController = require('./controllers/api'),
    contactController = require('./controllers/contact');

/**
 * Load middlewares.
 */

var middleware = require('./middleware');

/**
 * API keys + Passport configuration.
 */

var secrets = require('./config/secrets');
var passportConf = require('./config/passport');

/**
 * Create Express server.
 */

var app = express();

/**
 * Mongoose configuration.
 */

mongoose.connect(secrets.db);
mongoose.connection.on('error', function() {
  console.error('✗ MongoDB Connection Error. Please make sure MongoDB is running.');
});

/**
 * Express configuration.
 */

var hour = 3600000;
var day = (hour * 24);
var month = (day * 30);

app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(connectAssets({
  paths: ['public/css', 'public/js'],
  helperContext: app.locals
}));
app.use(express.compress());
app.use(express.logger('dev'));
app.use(express.cookieParser());
app.use(express.json());
app.use(express.urlencoded());
app.use(expressValidator());
app.use(express.bodyParser());
app.use(express.methodOverride());

var sessionStore = new MongoStore({
    url: secrets.db,
    auto_reconnect: true
});
app.use(express.session({
  secret: secrets.sessionSecret,
  store: sessionStore
}));

app.use(express.static(path.join(__dirname, 'public'), { maxAge: month }));
app.use(express.favicon(path.join(__dirname, 'public/img/favicon.ico')));


var csrf = function(req, res, next) {
    app.use(express.csrf());
    res.locals.token = req.csrfToken();
    next();
}

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

// Keep track of previous URL
app.use(function(req, res, next) {
  if (req.method !== 'GET') return next();
  var path = req.path.split('/')[1];
  if (/(auth|login|logout|signup)$/.test(path)) return next();
  req.session.returnTo = req.path;
  next();
});

// Attach user info to req
app.use(function(req, res, next) {
  res.locals.user = req.user;
  res.locals.secrets = secrets;
  next();
});

app.use(app.router);
app.use(function(req, res) {
  res.status(404);
  res.render('404');
});
app.use(express.errorHandler());

/**
 * Application routes.
 */

app.get('/', homeController.index);
app.get('/contact', contactController.getContact);
app.post('/contact', contactController.postContact);

// User routes
app.get('/dashboard', middleware.redirectToLoginIfNotLoggedIn, homeController.dashboard);
app.get('/post/new', middleware.redirectToLoginIfNotLoggedIn, postController.newPost);
app.post('/post/new', middleware.redirectToLoginIfNotLoggedIn, postController.newPostSubmit);

// Post routes
app.get('/post/:post', postController.viewPost);

// Account routes
app.get('/login', middleware.redirectToDashboardIfLoggedIn, userController.getLogin);
app.post('/login', userController.postLogin);
app.get('/logout', userController.logout);
app.get('/forgot', userController.getForgot);
app.post('/forgot', userController.postForgot);
app.get('/reset/:token', userController.getReset);
app.post('/reset/:token', userController.postReset);
app.get('/signup', userController.getSignup);
app.post('/signup', userController.postSignup);
app.get('/account', passportConf.isAuthenticated, userController.getAccount);
app.post('/account/profile', passportConf.isAuthenticated, userController.postUpdateProfile);
app.post('/account/password', passportConf.isAuthenticated, userController.postUpdatePassword);
app.post('/account/delete', passportConf.isAuthenticated, userController.postDeleteAccount);
app.get('/account/unlink/:provider', passportConf.isAuthenticated, userController.getOauthUnlink);

// Api routes
app.get('/api', apiController.getApi);
app.get('/api/lastfm', apiController.getLastfm);
app.get('/api/nyt', apiController.getNewYorkTimes);
app.get('/api/aviary', apiController.getAviary);
app.get('/api/paypal', apiController.getPayPal);
app.get('/api/paypal/success', apiController.getPayPalSuccess);
app.get('/api/paypal/cancel', apiController.getPayPalCancel);
app.get('/api/steam', apiController.getSteam);
app.get('/api/scraping', apiController.getScraping);
app.get('/api/twilio', apiController.getTwilio);
app.post('/api/twilio', apiController.postTwilio);
app.get('/api/clockwork', apiController.getClockwork);
app.post('/api/clockwork', apiController.postClockwork);
app.get('/api/foursquare', passportConf.isAuthenticated, passportConf.isAuthorized, apiController.getFoursquare);
app.get('/api/tumblr', passportConf.isAuthenticated, passportConf.isAuthorized, apiController.getTumblr);
app.get('/api/facebook', passportConf.isAuthenticated, passportConf.isAuthorized, apiController.getFacebook);
app.get('/api/github', passportConf.isAuthenticated, passportConf.isAuthorized, apiController.getGithub);
app.get('/api/twitter', passportConf.isAuthenticated, passportConf.isAuthorized, apiController.getTwitter);
app.get('/api/venmo', passportConf.isAuthenticated, passportConf.isAuthorized, apiController.getVenmo);
app.post('/api/venmo', passportConf.isAuthenticated, passportConf.isAuthorized, apiController.postVenmo);
app.get('/api/linkedin', passportConf.isAuthenticated, passportConf.isAuthorized, apiController.getLinkedin);

/**
 * OAuth routes for sign-in.
 */

app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email', 'user_location'] }));
app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login' }), function(req, res) {
  res.redirect(req.session.returnTo || '/');
});
app.get('/auth/github', passport.authenticate('github'));
app.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/login' }), function(req, res) {
  res.redirect(req.session.returnTo || '/');
});
app.get('/auth/google', passport.authenticate('google', { scope: 'profile email' }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), function(req, res) {
  res.redirect(req.session.returnTo || '/');
});
app.get('/auth/twitter', passport.authenticate('twitter'));
app.get('/auth/twitter/callback', passport.authenticate('twitter', { failureRedirect: '/login' }), function(req, res) {
  res.redirect(req.session.returnTo || '/');
});
app.get('/auth/linkedin', passport.authenticate('linkedin', { state: 'SOME STATE' }));
app.get('/auth/linkedin/callback', passport.authenticate('linkedin', { failureRedirect: '/login' }), function(req, res) {
  res.redirect(req.session.returnTo || '/');
});

/**
 * OAuth routes for API examples that require authorization.
 */

app.get('/auth/foursquare', passport.authorize('foursquare'));
app.get('/auth/foursquare/callback', passport.authorize('foursquare', { failureRedirect: '/api' }), function(req, res) {
  res.redirect('/api/foursquare');
});
app.get('/auth/tumblr', passport.authorize('tumblr'));
app.get('/auth/tumblr/callback', passport.authorize('tumblr', { failureRedirect: '/api' }), function(req, res) {
  res.redirect('/api/tumblr');
});
app.get('/auth/venmo', passport.authorize('venmo', { scope: 'make_payments access_profile access_balance access_email access_phone' }));
app.get('/auth/venmo/callback', passport.authorize('venmo', { failureRedirect: '/api' }), function(req, res) {
  res.redirect('/api/venmo');
});

// Listen to server
var server = require('http').Server(app),
    ss = require('socket.io-stream'),
    fs = require('fs'),
    passportSocketIo = require("passport.socketio");

var passportAuthorization = passportSocketIo.authorize({
    cookieParser: express.cookieParser,
    key:    'connect.sid',          // the cookie where express (or connect) stores its session id.
    secret: secrets.sessionSecret,               // the session secret to parse the cookie
    store:   sessionStore,          // the session store that express uses
    fail: function(data, err, someBool, accept) {
        console.log("Failed handshake");
        accept(null, true);        // second param takes boolean on whether or not to allow handshake
    },
    success: function(data, accept) {
        console.log("Successful handshake");
        accept(null, true);
    }
});

var io = require('socket.io').listen(server);
io.configure(function() {
    io.set("authorization", passportAuthorization);
});

io.on('connection', function(socket){ 
    socket.on('connect', function() {
        console.log("Socket connected");
    });

    socket.on('subscribe', function(data) {
        console.log('client subscribed to ', data.room);
        socket.join(data.room);
    });

    socket.in('post').on('post-update', function(data) {
        var post = require('./models/post');
        console.log(data);
        post.findOne({ _id: data.id }, function(err, post) {
            post.title = data.title;
            post.description = data.description;
            post.save(function(err, post, numberAffected) {
                console.log('post saved');
                socket.broadcast.to('post').emit('update-' + post.id, {
                    elements: {
                        '.post-title': post.title,
                        '.post-description': post.description
                    }
                });
            });
        });
    });

    socket.on('disconnect', function(){
        console.log("Socket disconnected");
    });
    ss(socket).on('image-upload', function(stream, data) {
        var post = require('./models/post'),
            filename = path.basename(data.name.name),
            filepath = path.join(__dirname, '/public/uploads/original/' + path.basename(data.name.name)),
            url = '/uploads/original/' + filename;
        stream.pipe(fs.createWriteStream(filepath));
        stream.on('end', function() {
            var postData = {
                user: {
                    uid: socket.handshake.user.id,
                    name: socket.handshake.user.profile.name
                },
                pic: {
                    originalPath: filepath,
                    originalUrl: url,
                    thumbPath: "",
                    thumbUrl: "",
                }
            };
            var newPost = new post(postData);
            newPost.save(function(err, newPost, numberAffected) {
                console.log("New post saved");
                socket.emit("image-upload-complete", {imageUrl: url, postUrl: newPost.url});
            });
        });
    });
});

/**
 * Start Express server.
 */

server.listen(app.get('port'), function() {
  console.log("✔ Express server listening on port %d in %s mode", app.get('port'), app.settings.env);
});

module.exports = app;
