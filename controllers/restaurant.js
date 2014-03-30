'use strict';

var async = require('async'),
    restaurant = require('../models/restaurant'),
    post = require('../models/post');

exports.restaurant = function(req, res) {
    var breadcrumbs = [
        { text: 'Dashboard', url: '/dashboard', class: ''},
        { text: 'Restaurants', url: '/restaurants', class: ''},
        { text: res.locals.restaurant.name, url: '/Restaurants/' + res.locals.restaurant.id, class: 'active'}
    ];

    async.parallel({
        posts: function(next) {
            post.find({'_restaurant': res.locals.restaurant.id }).sort('-_id').exec(function(err, posts) {
                next(err, posts);
            });
        },
    }, function(err, results) {
        res.render('home/restaurant', {
            title: 'Restaurant | ' + res.locals.restaurant.name,
            breadcrumbs: breadcrumbs,
            posts: results.posts,
            user: res.locals.user
        });
    });

};

exports.restaurants = function(req, res) {
    var breadcrumbs = [
        { text: 'Dashboard', url: '/dashboard', class: ''},
        { text: 'Restaurants', url: '/restaurants', class: 'active'}
    ];

    restaurant.find({}, function(err, restaurants) {
        res.render('home/restaurants', {
            title: 'Restaurants',
            breadcrumbs: breadcrumbs,
            restaurants: restaurants
        });
    });
}
