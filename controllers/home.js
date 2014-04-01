'use strict';

var async = require('async'),
    post = require('../models/post'),
    user = require('../models/User'),
    city = require('../models/city'),
    restaurant = require('../models/restaurant'),
    category = require('../models/category');

exports.profile = function(req, res) {
    res.redirect(req.user.url);
};

exports.user = function(req, res) {
    var breadcrumbs = [
        { text: 'Home', url: '/', class: ''},
        { text: 'Users', url: '/users/', class: ''},
        { text: res.locals.user.profile.name, url: '/user/' + res.locals.user.id, class: 'active'}
    ];

    async.parallel({
        posts: function(next) {
            post.find({'user.uid': req.params.user }).sort('-_id').exec(function(err, posts) {
                next(err, posts);
            });
        },
    }, function(err, results) {
        res.render('home/user', {
            breadcrumbs: breadcrumbs,
            posts: results.posts,
            user: res.locals.user
        });
    });

};

exports.users = function(req, res) {
    var breadcrumbs = [
        { text: 'Home', url: '/', class: ''},
        { text: 'Users', url: '/users', class: 'active'},
    ];

    user.find().sort('-_id').exec(function(err, users){
        res.render('home/users', {
            title: "Users",
            breadcrumbs: breadcrumbs,
            users: users
        });
    });
};

exports.home = function(req, res) {
    var myPosts, recentPosts;
    var breadcrumbs = [{ text: 'Home', url: '/', class: 'active'}];

    if (!!!req.user) {
        res.render('home', {
            title: 'Home'
        });
    } else {
        async.parallel({
            categories: function(next) {
                category.find({}, function(err, categories) {
                    next(err, categories);
                });
            },
            cities: function(next) {
                city.find({}, function(err, cities) {
                    next(err, cities);
                });
            },
            restaurants: function(next) {
                restaurant.find({}, function(err, restaurants) {
                    next(err, restaurants);
                });
            },
           myPosts: function(next) { 
                post.find({ 'user.uid': req.user.id }).sort('-_id').exec(function(err, posts){
                    next(err, posts);
                });
            },
            recentPosts: function(next) {
                recentPosts = post.find({ 'user.uid': {'$ne': req.user.id }}).sort('-_id').exec(function(err, posts){
                    next(err, posts);
                });
            }
        }, function(err, results) {
            res.render('home/dashboard', {
                title: 'Home',
                breadcrumbs: breadcrumbs,
                myPosts: results.myPosts,
                recentPosts: results.recentPosts,
                restaurants: results.restaurants,
                categories: results.categories,
                cities: results.cities
            });
        });
    }
};
