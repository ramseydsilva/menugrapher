'use strict';

var async = require('async'),
    breadcrumb = require('../helpers/breadcrumb'),
    item = require('../models/item'),
    restaurant = require('../models/restaurant'),
    city = require('../models/city'),
    post = require('../models/post');

exports.item = function(req, res) {
    var item = res.locals.item;
    async.parallel({
        restaurant: function(next) {
            restaurant.findOne({'_id': item._restaurant}).populate('menu').exec(function(err, restaurant) {
                next(err, restaurant);
            });
        },
        posts: function(next) {
            post.find({'_item': res.locals.item.id }).sort('-_id')
                .populate('_city').populate('_item').populate('_category').exec(function(err, posts) {
                next(err, posts);
            });
        },
    }, function(err, results) {
        var breadcrumbs = [breadcrumb.home(), breadcrumb.city(item._restaurant._city), breadcrumb.restaurant(results.restaurant), breadcrumb.item(item, 'active')];
        res.render('home/item', {
            title: 'item | ' + item.name,
            breadcrumbs: breadcrumbs,
            posts: results.posts,
            restaurant: results.restaurant
        });
    });
};
