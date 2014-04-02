'use strict';

var restaurant = require('../models/restaurant'),
    middleware = {};

middleware.restaurantExists = function(req, res, next) {
    restaurant.findOne({_id: req.param('restaurant')}).populate('_city').populate('menu').exec(function(err, restaurant) {
        if (restaurant) {
            res.locals.restaurant = restaurant;
            next();
        } else {
            res.status(404);
            res.render('404');
        }
    });
}

module.exports = middleware;
