'use strict';

var post = require('../models/post'),
    middleware = {};

middleware.postExists = function(req, res, next) {
    post.findOne({_id: req.param('post')}, function(err, post) {
        if (post) {
            res.locals.post = post;
            next();
        } else {
            res.status(404);
            res.render('404');
        }
    });
}

middleware.userCanEdit = function(req, res, next) {
    if (res.locals.post.user.uid == req.user.id) {
        next();
    } else {
        res.status(405);
        res.send();
    }
}

module.exports = middleware;

