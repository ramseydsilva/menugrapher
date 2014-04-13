'use strict';

var Restaurant = require('../models/restaurant'),
    _ = require('underscore'),
    async = require('async'),
    fetch = require('../fetch/restaurant'),
    linker = require('socialfinder'),
    middleware = {};

middleware.restaurantExists = function(req, res, next) {
    Restaurant.findOne({_id: req.param('restaurant')}).populate('_city').populate('menu').exec(function(err, restaurant) {
        if (restaurant) {
            restaurant.update({ $inc: { hits: 1 }}).exec(); // Update the hits
            res.locals.restaurant = restaurant;
            next();
        } else {
            res.status(404);
            res.render('404');
        }
    });
}

middleware.getRestaurantData = function(req, res, cb) {
    var restaurant = res.locals.restaurant,
        updated = false;
    async.series({
        googleMaps: function(next) {
            fetch.googleMaps(restaurant, function(err, doc) {
                doc.populateData('fetch.googleMaps', function(err, doc) {
                    updated = true;
                    next(err, doc);
                });
            });
        },
        googlePlacesSearch: function(next) {
            fetch.googlePlacesSearch(restaurant, function(err, doc) {
                if (!err && !!doc) {
                    updated = true;
                    doc.populateData('fetch.googlePlacesSearch', next);
                } else {
                    next(null, restaurant);
                }
            });
        },
        googlePlacesDetail: function(next) {
            fetch.googlePlacesDetail(restaurant, function(err, doc) {
                if (!err && !!doc) {
                    updated = true;
                    doc.populateData('fetch.googlePlacesDetail', true, next);
                } else {
                    doc.populateData('fetch.googlePlacesDetail', true, next);
                }
            });
        },
        getLinks: function(next) {
            Restaurant.findOne({_id: restaurant._id}).exec(function(err, doc) {
                if (!!doc.website && doc.links.length == 0) {
                    var l = new linker();
                    l.crawl(doc.website)
                    .progressed(function(data) {
                        console.log('Progressed: ', data);
                        doc.update({$addToSet: {links: data}}, function() {});
                    });
                }
                next();
            });
        },
    }, function(err, results) {
        if (updated) {
            Restaurant.findOne({_id: restaurant._id}).populate('_city').populate('menu').exec(function(err, doc) {
                res.locals.restaurant = doc;
                cb();
            });
        } else {
            cb();
        }
    });
}
module.exports = middleware;
