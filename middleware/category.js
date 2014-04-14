'use strict';

var Category = require('../models/category'),
    async = require('async'),
    middleware = {};

middleware.categoryExists = function(req, res, next) {
    async.parallel({
        id: function(next) {
            Category.findOne({_id: req.param('category')}, function(err, doc) {
                next(null, doc)
            });
        },
        slug: function(next) {
            Category.findOne({slug: req.param('category')}, next);
        }
    }, function(err, results) {
        var category = (results.id || results.slug);
        if (!!category) {
            category.update({ $inc: { hits: 1 }}).exec(); // Update the hits
            res.locals.category = category;
            next();
        } else {
            res.status(404);
            res.render('404');
        }
    });
}

module.exports = middleware;
