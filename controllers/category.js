'use strict';

var async = require('async'),
    category = require('../models/category'),
    breadcrumb = require('../helpers/breadcrumb'),
    post = require('../models/post');

exports.category = function(req, res) {
    var category = res.locals.category;
    var breadcrumbs = [ breadcrumb.home(), breadcrumb.categories(), breadcrumb.category(category, 'active') ];
    async.parallel({
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
            user: res.locals.user
        });
    });

};

exports.categories = function(req, res) {
    var breadcrumbs = [ breadcrumb.home(), breadcrumb.categories('active') ];
    category.find({}, function(err, categories) {
        res.render('home/categories', {
            title: 'Categories',
            breadcrumbs: breadcrumbs,
            categories: categories
        });
    });
}
