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
    slashes = require('connect-slashes'),
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

var homeMiddleware = require('./middleware'),
    postMiddleware = require('./middleware/post');

/**
 * API keys + Passport configuration.
 */

var secrets = require('./config/secrets');

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

app.use(slashes());
app.use(express.csrf());

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

// Attach locals
app.use(function(req, res, next) {
    res.locals.user = req.user;
    res.locals.secrets = secrets;
    res.locals.token = req.csrfToken();
    next();
});


app.use(app.router);
app.use(function(req, res) {
  res.status(404);
  res.render('404');
});
app.use(express.errorHandler());
var routes = require('./routes')(app);

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
        socket.join(data.room);
    });

    socket.in('post').on('post-update', function(data) {
        var post = require('./models/post');
        console.log(data);
        post.findOne({ _id: data.id }, function(err, post) {
            post.title = data.title;
            post.description = data.description;
            post.save(function(err, post, numberAffected) {
                socket.in('post-'+ post.id).emit('post-update', {
                    action: 'redirect',
                    url: post.url
                });  // Emit to emitting socket, get them to redirect to post page on successful edit

                var elementsToUpdate = {};
                elementsToUpdate['#' + post.id + ' .post-title'] = post.title;
                elementsToUpdate['#' + post.id + ' .post-description'] = post.description;

                socket.broadcast.to('post-' + post.id).emit('post-update', {
                    action: 'update',
                    elements: elementsToUpdate
                });  // Emit to other sockets to update their info
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
                socket.emit("image-upload-complete", { redirectUrl: newPost.url + '/edit' });
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
