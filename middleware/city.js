'use strict';

var city = require('../models/city'),
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

module.exports = middleware;
