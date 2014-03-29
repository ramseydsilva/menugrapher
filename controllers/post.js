'use strict';

var fs = require('fs'),
    post = require('../models/post'),
    formidable = require('formidable'),
    path = require('path'),
    util = require('util');

exports.new = function(req, res) {
    post.find(function(err, posts) {
        res.render('post/newPost', {
            title: 'New Post'
        });
    });
}

exports.post = function(req, res) {
    res.render('post/post', {
        title: "Post",
        post: res.locals.post
    });
};

exports.edit = function(req, res) {
    res.render('post/edit', {
        title: "Edit Post",
        post: res.locals.post 
    });
}
