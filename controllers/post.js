'use strict';

var fs = require('fs'),
    post = require('../models/post'),
    formidable = require('formidable'),
    path = require('path'),
    util = require('util');

exports.viewPost = function(req, res) {
    post.findOne({_id: req.param('post')}, function(err, post) {
        if (post) {
            res.render('post/view', {
                title: "Post",
                post: post
            });
        } else {
            res.status(404);
            res.render('404');
        }
    });
};

exports.newPost = function(req, res) {
    post.find(function(err, posts) {
        res.render('post/newPost', {
            title: 'New Post'
        });
    });
}

exports.newPostSubmit = function(req, res) {
    var form = req.body;
};
