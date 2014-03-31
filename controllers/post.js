'use strict';

var async = require('async'),
    ss = require('socket.io-stream'),
    post = require('../models/post'),
    city = require('../models/city'),
    category = require('../models/category'),
    restaurant = require('../models/restaurant'),
    formidable = require('formidable'),
    path = require('path'),
    moment = require('moment'),
    jade = require('jade'),
    postSocket = require('../socket.io/post');


exports.posts = function(req, res) {
    var breadcrumbs = [
        { text: 'Dashboard', url: '/dashboard', class: ''},
        { text: 'Posts', url: '/posts/', class: 'active'},
    ];

    post.find().sort('-_id').exec(function(err, posts){
        res.render('post/posts', {
            title: "Posts",
            breadcrumbs: breadcrumbs,
            posts: posts
        });
    });
};

exports.new = function(req, res) {
    var breadcrumbs = [
        { text: 'Dashboard', url: '/dashboard', class: ''},
        { text: 'Posts', url: '/posts/', class: ''},
        { text: 'New', url: '/post/new', class: 'active'}
    ];

    res.render('post/newPost', {
        title: 'New Post',
        breadcrumbs: breadcrumbs
    });
};

exports.post = function(req, res) {
    var breadcrumbs = [
        { text: 'Dashboard', url: '/dashboard', class: ''},
        { text: 'Posts', url: '/posts/', class: ''},
        { text: res.locals.post.title, url: res.locals.post.url, class: 'active'}
    ];

    res.render('post/post', {
        title: "Post",
        breadcrumbs: breadcrumbs,
        post: res.locals.post,
        userHasRights: res.locals.post.userHasRights(req.user),
        time: moment(res.locals.post.createdAt).fromNow()
    });
};

exports.edit = function(req, res) {
    var breadcrumbs = [
        { text: 'Dashboard', url: '/dashboard', class: ''},
        { text: 'Posts', url: '/posts/', class: ''},
        { text: res.locals.post.title, url: res.locals.post.url, class: ''},
        { text: 'Edit', url: res.locals.post.editUrl, class: 'active'}
    ];

    var city = !!res.locals.post._city ? res.locals.post._city.name : '';
    var category = !!res.locals.post._category ? res.locals.post._category.name : '';
    var restaurant = !!res.locals.post._restaurant ? res.locals.post._restaurant.name : '';

    res.render('post/edit', {
        title: "Edit Post",
        breadcrumbs: breadcrumbs,
        post: res.locals.post,
        city: city,
        category: category,
        restaurant: restaurant,
        back: {
            text: 'Back to Post',
            href: res.locals.post.url
        }
    });
};

exports.delete = function(req, res) {
    var breadcrumbs = [
        { text: 'Dashboard', url: '/dashboard', class: ''},
        { text: 'Posts', url: '/posts/', class: ''},
        { text: res.locals.post.title, url: res.locals.post.url, class: ''},
        { text: 'Delete', url: res.locals.post.deleteUrl, class: 'active'}
    ];

    res.render('post/delete', {
        title: "Delete Post",
        breadcrumbs: breadcrumbs,
        post: res.locals.post,
        back: {
            text: 'Back to Post',
            href: res.locals.post.url
        }
    });
};

exports.deletePost = function(req, res) {
    res.locals.post.remove(function(err, post) {
        if (err) res.redirect(post.deleteUrl);  // TODO: Handle error
        res.redirect(req.body.redirect);
    });
};

