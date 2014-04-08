'use strict';

var async = require('async'),
    post = require('../models/post'),
    album = require('../models/album'),
    user = require('../models/User'),
    city = require('../models/city'),
    breadcrumb = require('../helpers/breadcrumb'),
    restaurant = require('../models/restaurant'),
    category = require('../models/category');

exports.profile = function(req, res) {
    res.redirect(req.user.url);
};

exports.user = function(req, res) {
    var currentUser = res.locals.currentUser;
    async.parallel({
        breadcrumbs: function(next) {
            next(null, [ breadcrumb.home(), breadcrumb.users(), breadcrumb.user(currentUser, 'active') ]);
        },
        posts: function(next) {
            post.find({'_user': currentUser._id }).sort('-_id').populate('_city').populate('_restaurant').populate('_category').exec(function(err, posts) {
                next(err, posts);
            });
        },
        albums: function(next) {
            album.find({_user: currentUser._id}).sort('-_id').exec(function(err, albums) {
                if (!!req.user && currentUser.id == res.locals.user._id) {
                    albums.splice(0, 0, {name: 'Create new', url: '/posts/new?album=true' });
                }
                next(err, albums);
            });
        }
    }, function(err, results) {
        res.render('home/user', {
            breadcrumbs: results.breadcrumbs,
            posts: results.posts,
            albums: results.albums
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
    var breadcrumbs, categories, cities, myPosts, recentPosts;

    async.parallel({
        breadcrumbs: function(next) {
            next(null, [breadcrumb.home()]);
        },
        categories: function(next) {
            category.find().sort('-hits').limit(10).exec(function(err, categories) {
                next(err, categories);
            });
        },
        cities: function(next) {
            city.find().sort('-hits').limit(10).exec(function(err, cities) {
                next(err, cities);
            });
        },
        posts: function(next) { 
            post.find().sort('-_id').populate('_city')
                .populate('_restaurant').populate('_category').exec(function(err, posts){
                next(err, posts);
            });
        }
    }, function(err, results) {
        breadcrumbs = results.breadcrumbs;
        categories = results.categories;
        cities = results.cities;

        res.render('home', {
            title: 'Home',
            breadcrumbs: breadcrumbs,
            posts: results.posts,
            categories: categories,
            cities: cities
        });
    });
};
