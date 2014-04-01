'use strict';

var passport = require('passport'),
    passportConf = require('./config/passport'),
    post = require('./models/post'),
    city = require('./models/city'),
    restaurant = require('./models/restaurant'),
    category = require('./models/category'),
    restify = require('express-restify-mongoose');

var routes = function(app) {

    var homeController = require('./controllers/home'),
        cityController = require('./controllers/city'),
        categoryController = require('./controllers/category'),
        restaurantController = require('./controllers/restaurant'),
        postController = require('./controllers/post'),
        userController = require('./controllers/user'),
        socialApiController = require('./controllers/social'),
        apiController = require('./controllers/api'),
        contactController = require('./controllers/contact');

    var homeMiddleware = require('./middleware/home'),
        cityMiddleware = require('./middleware/city'),
        categoryMiddleware = require('./middleware/category'),
        restaurantMiddleware = require('./middleware/restaurant'),
        postMiddleware = require('./middleware/post');

    /**
     * Application routes.
     */

    app.get('/', homeController.home);
    app.get('/users', homeController.users);
    app.get('/profile', passportConf.isAuthenticated, homeController.profile);
    app.get('/users/:user', homeMiddleware.userExists, homeController.user);
    app.get('/contact', contactController.getContact);
    app.post('/contact', contactController.postContact);

    // Post routes
    app.get('/posts', postController.posts);
    app.get('/posts/new', homeMiddleware.redirectToLoginIfNotLoggedIn, postController.new);
    app.get('/posts/:post', postMiddleware.postExists, postController.post);
    app.get('/posts/:post/edit', postMiddleware.postExists, postMiddleware.userHasRights, postController.edit);
    app.get('/posts/:post/delete', postMiddleware.postExists, postMiddleware.userHasRights, postController.delete);

    // City, Restaurant, Category
    app.get('/cities', cityController.cities);
    app.get('/cities/:city', cityMiddleware.cityExists, cityController.city);
    app.get('/cities/:city/restaurants', cityMiddleware.cityExists, cityController.restaurants);
    app.get('/restaurants', restaurantController.restaurants);
    app.get('/restaurants/:restaurant', restaurantMiddleware.restaurantExists, restaurantController.restaurant);
    app.get('/categories', categoryController.categories);
    app.get('/categories/:category', categoryMiddleware.categoryExists, categoryController.category);

    // API routes
    restify.serve(app, city);
    restify.serve(app, restaurant);
    restify.serve(app, category);
    restify.serve(app, post);

    // Account routes
    app.get('/login', homeMiddleware.redirectToHomeIfLoggedIn, userController.getLogin);
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
    app.get('/api', socialApiController.getApi);
    app.get('/api/lastfm', socialApiController.getLastfm);
    app.get('/api/nyt', socialApiController.getNewYorkTimes);
    app.get('/api/aviary', socialApiController.getAviary);
    app.get('/api/paypal', socialApiController.getPayPal);
    app.get('/api/paypal/success', socialApiController.getPayPalSuccess);
    app.get('/api/paypal/cancel', socialApiController.getPayPalCancel);
    app.get('/api/steam', socialApiController.getSteam);
    app.get('/api/scraping', socialApiController.getScraping);
    app.get('/api/twilio', socialApiController.getTwilio);
    app.post('/api/twilio', socialApiController.postTwilio);
    app.get('/api/clockwork', socialApiController.getClockwork);
    app.post('/api/clockwork', socialApiController.postClockwork);
    app.get('/api/foursquare', passportConf.isAuthenticated, passportConf.isAuthorized, socialApiController.getFoursquare);
    app.get('/api/tumblr', passportConf.isAuthenticated, passportConf.isAuthorized, socialApiController.getTumblr);
    app.get('/api/facebook', passportConf.isAuthenticated, passportConf.isAuthorized, socialApiController.getFacebook);
    app.get('/api/github', passportConf.isAuthenticated, passportConf.isAuthorized, socialApiController.getGithub);
    app.get('/api/twitter', passportConf.isAuthenticated, passportConf.isAuthorized, socialApiController.getTwitter);
    app.get('/api/venmo', passportConf.isAuthenticated, passportConf.isAuthorized, socialApiController.getVenmo);
    app.post('/api/venmo', passportConf.isAuthenticated, passportConf.isAuthorized, socialApiController.postVenmo);
    app.get('/api/linkedin', passportConf.isAuthenticated, passportConf.isAuthorized, socialApiController.getLinkedin);

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
};

module.exports = routes;
