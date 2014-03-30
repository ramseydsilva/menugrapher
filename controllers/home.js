'use strict';

var post = require('../models/post'),
    user = require('../models/User'),
    async = require('async');

exports.index = function(req, res) {
    res.render('home', {
        title: 'Home'
    });
};

exports.user = function(req, res) {
    var breadcrumbs = [
        { text: 'Dashboard', url: '/dashboard', class: ''},
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
        { text: 'Dashboard', url: '/dashboard', class: ''},
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

exports.dashboard = function(req, res) {
    var myPosts, recentPosts;
    var breadcrumbs = [{ text: 'Dashboard', url: '/dashboard', class: 'active'}];

    async.parallel([
        function(cb) {
            post.find({ 'user.uid': req.user.id }).sort('-_id').exec(function(err, posts){
                myPosts = posts;
                cb();
            });
        },
        function(cb) {
            recentPosts = post.find({ 'user.uid': {'$ne': req.user.id }}).sort('-_id').exec(function(err, posts){
                recentPosts = posts;
                cb();
            });
        }
    ], function(results) {
        res.render('home/dashboard', {
            title: 'Dashboard',
            breadcrumbs: breadcrumbs,
            myPosts: myPosts,
            recentPosts: recentPosts
        });
    });
}
