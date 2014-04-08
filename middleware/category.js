'use strict';

var category = require('../models/category'),
    middleware = {};

middleware.categoryExists = function(req, res, next) {
    category.findOne({_id: req.param('category')}).exec(function(err, category) {
        if (category) {
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
