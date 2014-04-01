'use strict';

var async = require('async'),
    Category = require('../models/category'),
    breadcrumb = require('../helpers/breadcrumb'),
    post = require('../models/post');

exports.category = function(req, res) {
    var category = res.locals.category;
    var breadcrumbs = [ breadcrumb.home(), breadcrumb.categories(), breadcrumb.category(category, 'active') ];
    async.parallel({
        categories: function(next) {
            Category.find({}, function(err, categories) {
                if (err) throw err;
                next(null, categories);
            });
        },
        posts: function(next) {
            post.find({'_category': category.id }).sort('-_id')
            .populate('_city').populate('_restaurant').populate('_category').exec(function(err, posts) {
                next(err, posts);
            });
        },
    }, function(err, results) {
        res.render('home/category', {
            title: 'Category | ' + category.name,
            breadcrumbs: breadcrumbs,
            posts: results.posts,
            categories: results.categories,
            user: res.locals.user
        });
    });

};

exports.categories = function(req, res) {
    var breadcrumbs = [ breadcrumb.home(), breadcrumb.categories('active') ];
    async.parallel({
        categories: function(next) {
            Category.find({}, function(err, categories) {
                if (err) throw err;
                next(null, categories);
            });
        },
        posts: function(next) {
            post.find({}).sort('-_id')
            .populate('_city').populate('_restaurant').populate('_category').exec(function(err, posts) {
                next(err, posts);
            });
        },
    }, function(err, results) {
        res.render('home/categories', {
            title: 'Categories',
            breadcrumbs: breadcrumbs,
            posts: results.posts,
            categories: results.categories
        });
    });
}
