'use strict';

var Album = require('../models/album'),
    async = require('async'),
    _ = require('underscore'),
    Post = require('../models/post'),
    middleware = {};

middleware.albumExists = function(req, res, next) {
    Album.findOne({_id: req.param('album')}).populate('_user').populate('pics').exec(function(err, album) {
        if (album) {
            async.map(album.pics, function(pic, callback) {
                Post.findOne({_id: pic._id}).populate('_city').populate('_category').populate('_restaurant').exec(function(err, post) {
                    if (err) throw err;
                    callback(err, post);
                });
            }, function(err, results) {
                album.pics = results;
                res.locals.album = album;
                next();
            });
        } else {
            res.status(404);
            res.render('404');
        }
    });
}

module.exports = middleware;
