'use strict';

var util = require('../util'),
    async = require('async'),
    City = require('../../models/city'),
    Restaurant = require('../../models/restaurant'),
    _ = require('underscore'),
    restaurantFixture = require('../fixtures/db/restaurant'),
    cityFixture = require('../fixtures/db/city');

var loadRestaurants = function(next) {
    async.series([
        function(next) {
            util.loadFixture(City, cityFixture.cities[0], function(err, doc) {
                next(err, doc);
            });
        }
    ], function(err, results) {
        var restaurants = [];
        _.each(restaurantFixture.restaurants, function(restaurant) {
            restaurant._city = results[0]._id;
            util.loadFixture(Restaurant, restaurant, function(err, doc) {
                if (err) next(err);
                restaurants.push(doc);
                if(restaurants.length == restaurantFixture.restaurants.length)
                    next(err, restaurants);
            });
        });
    });
};

module.exports.loadRestaurants = loadRestaurants;
