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
 * API keys + Passport configuration.
 */

var app = express();
app.secrets = require('./config/secrets');

/**
 * Create Express server.
 */


/**
 * Mongoose configuration.
 */

mongoose.connect(app.secrets.db);
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

app.cookieParser = express.cookieParser;  // Attach this to app to be called from socket.js
app.use(express.cookieParser());

app.use(express.json());
app.use(express.urlencoded());
app.use(expressValidator());
app.use(express.bodyParser());
app.use(express.methodOverride());

app.sessionStore = new MongoStore({
    url: app.secrets.db,
    auto_reconnect: true
});
app.use(express.session({
  secret: app.secrets.sessionSecret,
  store: app.sessionStore
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
    res.locals.secrets = app.secrets;
    res.locals.token = req.csrfToken();
    next();
});

app.use(app.router);
app.use(function(req, res) {
  res.status(404);
  res.render('404');
});
app.use(express.errorHandler());


app.server = require('http').Server(app),
app.socketio = require('./socket').socketio(app);
app.set('rootDir', __dirname);

var routes = require('./routes')(app);

/**
 * Start Express server.
 */

app.server.listen(app.get('port'), function() {
  console.log("✔ Express server listening on port %d in %s mode", app.get('port'), app.settings.env);
});

module.exports = app;
