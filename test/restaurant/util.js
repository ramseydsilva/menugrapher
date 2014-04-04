'use strict';

var util = require('../util'),
    Restaurant = require('../../models/restaurant'),
    _ = require('underscore'),
    restaurantFixture = require('../fixtures/db/restaurant');

var restaurants = [];
var loadRestaurants = function(next) {
    _.each(restaurantFixture.restaurants, function(restaurant) {
        util.loadFixture(Restaurant, restaurant, function(err, doc) {
            if (err) next(err);
            restaurants.push(doc);
            if(restaurants.length == restaurantFixture.restaurants.length)
                next(err, restaurants);
        });
    });
};
module.exports.loadRestaurants = loadRestaurants;
