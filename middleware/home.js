'use strict';

var User = require('../models/User'),
    middleware = {};


middleware.redirectToHomeIfLoggedIn = function(req, res, next) {
    if (req.user) {
        res.redirect('/');
    } else {
        next();
    }
}

middleware.redirectToLoginIfNotLoggedIn = function(req, res, next) {
    if (req.user) {
        next();
    } else {
        res.redirect('/login');
    }
}

middleware.userExists = function(req, res, next) {
    User.findOne({_id: req.param('user')}, function(err, currentUser) {
        if (currentUser) {
            console.log(currentUser);
            res.locals.currentUser = currentUser;
            next();
        } else {
            res.status(404);
            res.render('404');
        }
    });
}

module.exports = middleware;
