'use strict';

var Restaurant = require('../models/restaurant'),
    City = require('../models/city'),
    _ = require('underscore'),
    async = require('async'),
    fetch = require('../fetch/restaurant'),
    middleware = {};

middleware.restaurantExists = function(req, res, next) {
    // /restaurants/:id
    // /:city/:slug
    // /:slug
    async.parallel({
        id: function(next) {
            Restaurant.findOne({_id: req.param('restaurant')}, function(err, doc) {
                next(null, doc)
            });
        },
        slug: function(next) {
            var opts;
            if (req.param('city')) {
                opts = {'city.slug': req.param('city'), slug: req.param('restaurant')};
            } else {
                opts = {slug: req.param('restaurant')};
            }
            Restaurant.findOne(opts).populate('menu').exec(next);
        }
    }, function(err, results) {
        var restaurant = (results.id || results.slug);
        if (!!restaurant) {
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
                    doc.populateData('fetch.googlePlacesDetail', false, next);
                } else {
                    doc.populateData('fetch.googlePlacesDetail', false, next);
                }
            });
        },
        getLinksAndMenu: function(next) {
            Restaurant.findOne({_id: restaurant._id}).exec(function(err, doc) {
                if (!doc.dateCrawledWebsite || Date.now() > (doc.dateCrawledWebsite)) {// + (24*60*60*1000))) { // crawl once every day
                    doc.crawl();
                }
            });
            next();
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
