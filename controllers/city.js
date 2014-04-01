'use strict';

var async = require('async'),
    breadcrumb = require('../helpers/breadcrumb'),
    city = require('../models/city'),
    restaurant = require('../models/restaurant'),
    post = require('../models/post');

exports.restaurants = function(req, res) {
    var city = res.locals.city;
    async.parallel({
        breadcrumbs: function(next) {
            next(null, [ breadcrumb.home(), breadcrumb.city(city), breadcrumb.cityRestaurants(city, 'active') ]);
        },
        restaurants: function(next) {
            restaurant.find({_city: city._id}, function(err, restaurants) {
                console.log(err, restaurants);
                next(err, restaurants);
            });
        }
    }, function(err, results) {
        res.render('city/restaurants', {
            title: city.name,
            breadcrumbs: results.breadcrumbs,
            restaurants: results.restaurants,
            user: res.locals.user
        });
    });

};


exports.city = function(req, res) {
    var city = res.locals.city;
    async.parallel({
        breadcrumbs: function(next) {
            next(null, [ breadcrumb.home(), breadcrumb.city(city, 'active') ]);
        },
        restaurants: function(next) {
            restaurant.find({_city: city._id}, function(err, restaurants) {
                console.log(err, restaurants);
                next(err, restaurants);
            });
        },
        posts: function(next) {
            post.find({'_city': city.id }).sort('-_id').populate('_city').populate('_restaurant').populate('_category').exec(function(err, posts) {
                next(err, posts);
            });
        },
    }, function(err, results) {
        res.render('home/city', {
            title: city.name,
            breadcrumbs: results.breadcrumbs,
            posts: results.posts,
            restaurants: results.restaurants,
            user: res.locals.user
        });
    });

};

exports.cities = function(req, res) {
    var breadcrumbs = [ breadcrumb.home(), breadcrumb.cities('active') ];
    city.find({}, function(err, cities) {
        res.render('home/cities', {
            title: 'Cities',
            breadcrumbs: breadcrumbs,
            cities: cities
        });
    });
}
