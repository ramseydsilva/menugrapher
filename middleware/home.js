'use strict';

var user = require('../models/User'),
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
    user.findOne({_id: req.param('user')}, function(err, user) {
        if (user) {
            res.locals.user = user;
            next();
        } else {
            res.status(404);
            res.render('404');
        }
    });
}

module.exports = middleware;
