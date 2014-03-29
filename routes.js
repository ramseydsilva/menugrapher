'use strict';

var passport = require('passport'),
    passportConf = require('./config/passport');

var routes = function(app) {

    var homeController = require('./controllers/home'),
        postController = require('./controllers/post'),
        userController = require('./controllers/user'),
        apiController = require('./controllers/api'),
        contactController = require('./controllers/contact');

    var homeMiddleware = require('./middleware'),
        postMiddleware = require('./middleware/post');

    /**
     * Application sockets
     */
    postController.socketio(app);

    /**
     * Application routes.
     */

    app.get('/', homeController.index);
    app.get('/dashboard', homeMiddleware.redirectToLoginIfNotLoggedIn, homeController.dashboard);
    app.get('/contact', contactController.getContact);
    app.post('/contact', contactController.postContact);

    // Post routes
    app.get('/post/new', homeMiddleware.redirectToLoginIfNotLoggedIn, postController.new);
    app.get('/post/:post', postMiddleware.postExists, postController.post);
    app.get('/post/:post/edit', postMiddleware.postExists, postMiddleware.userHasRights, postController.edit);
    app.get('/post/:post/delete', postMiddleware.postExists, postMiddleware.userHasRights, postController.delete);
    app.post('/post/:post/delete', postMiddleware.postExists, postMiddleware.userHasRights, postController.deletePost);

    // Account routes
    app.get('/login', homeMiddleware.redirectToDashboardIfLoggedIn, userController.getLogin);
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
};

module.exports = routes;
