"use strict";

var middleware = {};

middleware.redirectToDashboardIfLoggedIn = function(req, res, next) {
    if (req.user) {
        res.redirect('/dashboard');
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

module.exports = middleware;
