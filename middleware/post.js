'use strict';

var post = require('../models/post'),
    querystring = require('querystring'),
    middleware = {};

middleware.postExists = function(req, res, next) {
    post.findOne({_id: req.param('post')}).populate('_city').populate('_restaurant').populate('_category').populate('_item').exec(function(err, post) {
        console.log(post);
        if (post) {
            res.locals.post = post;
            next();
        } else {
            res.status(404);
            res.render('404');
        }
    });
};

middleware.userHasRights = function(req, res, next) {
    if (res.locals.post.userHasRights(req.user)) {
        next();
    } else {
        res.status(405);
        res.send();
    }
};

middleware.getUploadUrl = function(req, res, next) {
    var uploadUrl = '/posts/new';
    var post = res.locals.post,
        city = res.locals.city,
        category = res.locals.category,
        restaurant = res.locals.restaurant,
        query = {};

    if (!!post) {
        if (!!post._city) city = post._city;
        if (!!post._restaurant) restaurant = post._restaurant;
        if (!!post._category) category = post._category;
    }

    if (!!restaurant && !!restaurant._city) city = restaurant._city;

    if (!!city) query['city'] = city.name;
    if (!!restaurant) query['restaurant'] = restaurant.name;
    if (!!category) query['category'] = category.name;

    res.locals.uploadUrl = uploadUrl + '?' + querystring.stringify(query);

    next();
};

module.exports = middleware;

