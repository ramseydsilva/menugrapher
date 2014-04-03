'use strict';

var User = require('../../models/User'),
    Post = require('../../models/post'),
    City = require('../../models/city'),
    Restaurant = require('../../models/restaurant'),
    Category = require('../../models/category'),
    Item = require('../../models/item'),
    async = require('async');

var ensureCityRestaurantCategoryItemLinkage = function(cityName, restaurantName, categoryName, itemName, callback) {
    async.waterfall([
        function(next) {
            City.find({}, function(err, cities) {
                cities.length.should.be.exactly(1);
                cities[0].name.should.be.exactly(cityName);
                next(err, cities[0]);
            });
        },
        function(city, next) {
            Restaurant.find({}, function(err, restaurants) {
                restaurants.length.should.be.exactly(1);
                restaurants[0].name.should.be.exactly(restaurantName);
                restaurants[0]._city.should.eql(city._id);
                next(err, city, restaurants[0]);
            });
        },
        function(city, restaurant, next) {
            Category.find({}, function(err, categories) {
                categories.length.should.be.exactly(1);
                categories[0].name.should.be.exactly(categoryName);
                next(err, city, restaurant, categories[0]);
            });
        },
        function(city, restaurant, category, next) {
            Item.find({}, function(err, items) {
                items.length.should.be.exactly(1);
                items[0].name.should.be.exactly(itemName);
                items[0]._restaurant.should.eql(restaurant._id);
                next(err, city, restaurant, category, items[0]);
            });
        }
    ], function(err, results) {
        callback(err, results);
    });
};
module.exports.ensureCityRestaurantCategoryItemLinkage = ensureCityRestaurantCategoryItemLinkage;
