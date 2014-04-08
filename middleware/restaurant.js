'use strict';

var Restaurant = require('../models/restaurant'),
    _ = require('underscore'),
    async = require('async'),
    fetch = require('../fetch/restaurant'),
    middleware = {};

middleware.restaurantExists = function(req, res, next) {
    Restaurant.findOne({_id: req.param('restaurant')}).populate('_city').populate('menu').exec(function(err, restaurant) {
        if (restaurant) {
            res.locals.restaurant = restaurant;
            next();
        } else {
            res.status(404);
            res.render('404');
        }
    });
}

middleware.getRestaurantData = function(req, res, cb) {
    var restaurant = res.locals.restaurant;
    async.series({
        googleMaps: function(next) {
            fetch.googleMaps(restaurant, function(err, doc) {
                restaurant.populate('fetch.googleMaps', function(err, doc) {
                    restaurant = doc;
                    next(err, doc);
                });
            });
        },
        googlePlacesSearch: function(next) {
            fetch.googlePlacesSearch(restaurant, function(err, doc) {
                if (!err && !!doc) {
                    restaurant = doc;
                    restaurant.populate('fetch.googlePlacesSearch', next);
                } else {
                    next(null, restaurant);
                }
            });
        },
        googlePlacesDetail: function(next) {
            fetch.googlePlacesDetail(restaurant, function(err, doc) {
                if (!err && !!doc) {
                    restaurant = doc;
                    restaurant.populate('fetch.googlePlacesDetail', next);
                } else {
                    next(null, restaurant);
                }
            });
        }
    }, function(err, results) {
        res.locals.restaurant = restaurant;
        cb();
    });
}
module.exports = middleware;
