'use strict';

/**
 * OurExpress app
 * @module app
 */
var express = require('express'),
    MongoStore = require('connect-mongo')(express),
    flash = require('express-flash'),
    path = require('path'),
    mongoose = require('mongoose'),
    passport = require('passport'),
    nconf = require('nconf'),
    expressValidator = require('express-validator'),
    connectAssets = require('connect-assets');

// Load configurations depending on the environment
nconf.argv().env();
nconf.file({ file: __dirname + '/config/' + nconf.get('env') + '/config.json' });
nconf.defaults({ 
    'env': 'dev',
    'rootDirPrefix': ''
});
nconf.argv().env().file({ file: __dirname + '/config/' + nconf.get('env') + '/config.json' });

// This will allow app to be called form anywhere in program
var app = module.exports = express(); 

// Load secrets
app.secrets = require('./config/' + nconf.get('env') + '/secrets');

// Connect to mongodb
app.secrets.db = nconf.get('db:host') + ':' + nconf.get('db:port') + '/' + nconf.get('db:name');
mongoose.connect(app.secrets.db);
mongoose.connection.on('error', function() {
  console.error('✗ MongoDB Connection Error. Please make sure MongoDB is running.');
});

// Load views and templating engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(connectAssets({
    paths: ['public/css', 'public/js'],
    helperContext: app.locals
}));
app.use(express.compress());
app.locals.truncateWords_html = function(html, words){
    return html.split(/\s/).slice(0, words).join(" ")
}

// Logger
app.use(express.logger('dev'));

// Load middlewares
app.cookieParser = express.cookieParser;  // Attach this to app to be called from socket.js
app.use(express.cookieParser());
app.use(express.json());
app.use(express.urlencoded());
app.use(expressValidator());
app.use(express.bodyParser());
app.use(express.methodOverride());

// Use Mongo as our session store
app.sessionStore = new MongoStore({
    url: app.secrets.db,
    auto_reconnect: true
}, function(ret) {
    // Start server only after MongoStore is initialized to avoid connection errors
    app.server.listen(nconf.get('http:port'), function() {
      console.log("✔ Express server listening on port %d in %s mode", nconf.get('http:port'), app.settings.env);
    });
});
app.use(express.session({
  secret: app.secrets.sessionSecret,
  store: app.sessionStore
}));

// Our static files
app.set('rootDir', path.join(__dirname, nconf.get('rootDirPrefix')));
app.use(express.static(path.join(app.get('rootDir'), 'public'), { maxAge: 3600000 * 24 * 30})); // Set maxage to a month
app.use(express.favicon(path.join(__dirname, 'public/img/favicon.ico')));

if (process.env.NODE_ENV == 'production') {
    app.use(express.csrf());
    app.use(function(req, res, next) {
        res.locals.token = req.csrfToken();
    });
};

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
    next();
});

// Load routes
app.use(app.router);
app.use(function(req, res) {
  res.status(404);
  res.render('404');
});
app.use(express.errorHandler());
var routes = require('./routes')(app);

// Start server and sockets
app.server = require('http').Server(app),
app.socketio = require('./socket.io').socketio(app);
