'use strict';

var async = require('async'),
    breadcrumb = require('../helpers/breadcrumb'),
    restaurant = require('../models/restaurant'),
    city = require('../models/city'),
    post = require('../models/post');

exports.restaurant = function(req, res) {
    var restaurant = res.locals.restaurant;
    async.parallel({
        breadcrumbs: function(next) {
            next(null, [breadcrumb.home(), breadcrumb.city(restaurant._city), breadcrumb.restaurant(restaurant, 'active')]);
        },
        posts: function(next) {
            post.find({'_restaurant': res.locals.restaurant.id }).sort('-_id')
                .populate('_city').populate('_restaurant').populate('_category').exec(function(err, posts) {
                next(err, posts);
            });
        },
    }, function(err, results) {
        res.render('restaurant/restaurant', {
            title: 'Restaurant | ' + restaurant.name,
            breadcrumbs: results.breadcrumbs,
            posts: results.posts,
            user: res.locals.user
        });
    });

};

exports.restaurants = function(req, res) {
    var breadcrumbs = [ breadcrumb.home(), breadcrumb.restaurants('active') ];
    restaurant.find({}, function(err, restaurants) {
        res.render('home/restaurants', {
            title: 'Restaurants',
            breadcrumbs: breadcrumbs,
            restaurants: restaurants
        });
    });
}
