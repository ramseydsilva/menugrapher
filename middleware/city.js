'use strict';

var City = require('../models/city'),
    fetch = require('../fetch/city'),
    async = require('async'),
    middleware = {};

middleware.cityExists = function(req, res, next) {
    // Query by id and slug
    async.parallel({
        id: function(next) {
            City.findOne({_id: req.param('city')}, function(err, doc) {
                next(null, doc)
            });
        },
        slug: function(next) {
            City.findOne({slug: req.param('city')}, next);
        }
    }, function(err, results) {
        var city = (results.id || results.slug);
        if (!!city) {
            city.update({ $inc: { hits: 1 }}).exec(); // Update the hits
            res.locals.city = city;
            next();
        } else {
            res.status(404);
            res.render('404');
        }
    });
}

middleware.cityLatLng = function(req, res, next) {
    fetch.getLatLng(res.locals.city, next);
}
module.exports = middleware;
