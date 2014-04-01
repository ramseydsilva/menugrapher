'use strict';

var async = require('async'),
    category = require('../models/category'),
    post = require('../models/post');

exports.category = function(req, res) {
    var breadcrumbs = [
        { text: 'Home', url: '/', class: ''},
        { text: 'Categories', url: '/categories', class: ''},
        { text: res.locals.category.name, url: '/Categories/' + res.locals.category.id, class: 'active'}
    ];

    async.parallel({
        posts: function(next) {
            post.find({'_category': res.locals.category.id }).sort('-_id').exec(function(err, posts) {
                next(err, posts);
            });
        },
    }, function(err, results) {
        res.render('home/category', {
            title: 'Category | ' + res.locals.category.name,
            breadcrumbs: breadcrumbs,
            posts: results.posts,
            user: res.locals.user
        });
    });

};

exports.categories = function(req, res) {
    var breadcrumbs = [
        { text: 'Home', url: '/', class: ''},
        { text: 'Categories', url: '/categories', class: 'active'}
    ];

    category.find({}, function(err, categories) {
        res.render('home/categories', {
            title: 'Categories',
            breadcrumbs: breadcrumbs,
            categories: categories
        });
    });
}
