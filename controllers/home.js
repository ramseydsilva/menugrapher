'use strict';

var async = require('async'),
    post = require('../models/post'),
    user = require('../models/User'),
    city = require('../models/city'),
    breadcrumb = require('../helpers/breadcrumb'),
    restaurant = require('../models/restaurant'),
    category = require('../models/category');

exports.profile = function(req, res) {
    res.redirect(req.user.url);
};

exports.user = function(req, res) {
    var user = res.locals.user;
    async.parallel({
        breadcrumbs: function(next) {
            next(null, [ breadcrumb.home(), breadcrumb.users(), breadcrumb.user(user, 'active') ]);
        },
        posts: function(next) {
            post.find({'user.uid': req.params.user }).sort('-_id').populate('_city').populate('_restaurant').populate('_category').exec(function(err, posts) {
                next(err, posts);
            });
        },
    }, function(err, results) {
        res.render('home/user', {
            breadcrumbs: results.breadcrumbs,
            posts: results.posts,
            user: res.locals.user
        });
    });

};

exports.users = function(req, res) {
    var breadcrumbs = [ breadcrumb.home(), { text: 'Users', url: '/users', class: 'active'}, ];
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
    if (!!!req.user) {
        res.render('home', {
            title: 'Home'
        });
    } else {
        async.parallel({
            breadcrumbs: function(next) {
                next(null, [breadcrumb.home()]);
            },
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
            myPosts: function(next) { 
                post.find({ 'user.uid': req.user.id }).sort('-_id').populate('_city')
                    .populate('_restaurant').populate('_category').exec(function(err, posts){
                    next(err, posts);
                });
            },
            recentPosts: function(next) {
                recentPosts = post.find({ 'user.uid': {'$ne': req.user.id }}).sort('-_id')
                    .populate('_city').populate('_restaurant').populate('_category').exec(function(err, posts){
                    next(err, posts);
                });
            }
        }, function(err, results) {
            res.render('home/dashboard', {
                title: 'Home',
                breadcrumbs: results.breadcrumbs,
                myPosts: results.myPosts,
                recentPosts: results.recentPosts,
                categories: results.categories,
                cities: results.cities
            });
        });
    }
};
