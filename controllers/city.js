'use strict';

var async = require('async'),
    city = require('../models/city'),
    restaurant = require('../models/restaurant'),
    post = require('../models/post');

exports.city = function(req, res) {
    var breadcrumbs = [
        { text: 'Home', url: '/', class: ''},
        { text: 'Cities', url: '/cities', class: ''},
        { text: res.locals.city.name, url: '/cities/' + res.locals.city.id, class: 'active'}
    ];

    async.parallel({
        restaurants: function(next) {
            restaurant.find({_city: res.locals.city._id}, function(err, restaurants) {
                console.log(err, restaurants);
                next(err, restaurants);
            });
        },
        posts: function(next) {
            post.find({'_city': res.locals.city.id }).sort('-_id').exec(function(err, posts) {
                next(err, posts);
            });
        },
    }, function(err, results) {
        res.render('home/city', {
            title: 'City | ' + res.locals.city.name,
            breadcrumbs: breadcrumbs,
            posts: results.posts,
            restaurants: results.restaurants,
            user: res.locals.user
        });
    });

};

exports.cities = function(req, res) {
    var breadcrumbs = [
        { text: 'Home', url: '/', class: ''},
        { text: 'Cities', url: '/cities', class: 'active'}
    ];

    city.find({}, function(err, cities) {
        res.render('home/cities', {
            title: 'Cities',
            breadcrumbs: breadcrumbs,
            cities: cities
        });
    });
}
