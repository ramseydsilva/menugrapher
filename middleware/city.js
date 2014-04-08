'use strict';

var City = require('../models/city'),
    fetch = require('../fetch/city'),
    middleware = {};

middleware.cityExists = function(req, res, next) {
    City.findOne({_id: req.param('city')}).exec(function(err, city) {
        if (city) {
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
