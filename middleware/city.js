'use strict';

var city = require('../models/city'),
    fetch = require('../fetch/city'),
    middleware = {};

middleware.cityExists = function(req, res, next) {
    city.findOne({_id: req.param('city')}).exec(function(err, city) {
        if (city) {
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
