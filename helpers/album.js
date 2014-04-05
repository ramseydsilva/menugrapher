'use strict';

var Album = require('../models/album'),
    async = require('async'),
    app = require('../app'),
    fs = require('fs'),
    path = require('path'),
    jade = require('jade');

var deleteAlbumIfEmpty = function(options, socket, io, callback) {
    // Don't force delete if the album has pictures
    deleteAlbum(options, false, socket, io, callback);
};

module.exports.deleteAlbumIfEmpty = deleteAlbumIfEmpty;

var deleteAlbum = function(options, force, socket, io, callback) {
    Album.findOne(options, function(err, album) {
        if (!!album) {
            var element = {};
            element['#album-' + album._id ] = '';

            // IF album is empty or if forceful delete
            if (!!force || album.pics.length == 0) {
                album.remove(function(err, doc) {
                    if (err) throw err;

                    socket.emit('create-album', {
                        success: true
                    });

                    io.sockets.in('albums-user-' + doc._user).emit('create-album', [{
                        action: 'remove',
                        elements: element
                    }]);
                });
            } else {
                socket.emit('create-album', {
                    error: 'Permission denied'
                });
            }
        } else {
            socket.emit('create-album', {
                error: 'Album not found'
            });
        }
        if (!!callback)
            callback();
    });
};
module.exports.deleteAlbum = deleteAlbum;

var assignPostToAlbum = function(post, albumId, currentUser, io, callback) {
    Album.findOneAndUpdate({_id: albumId}, { $addToSet: {pics: post._id}}, function(err, album) {
        async.parallel({
            assignRestaurantCityCategory: function(next) {
                if (!!!album._restaurant && post._restaurant)
                    album._restaurant = post._restaurant;
                if (!!!album._city && post._city)
                    album._city = post._city;
                if (!!!album._category && post._category)
                    album._category = post._category;
                album.save(function(err, album) {
                    next(err, album);
                });
            },
            generatePostHtml: function(next) {
                if (err) throw err;

                // Generate post html to send to client
                fs.readFile(path.join(app.get('views'), 'includes/post.jade'), 'utf8', function (err, data) {
                    if (err) throw err;

                    var elementsToUpdate = {},
                        fn = jade.compile(data),
                        postHtml = fn({
                            post: post,
                            user: currentUser,
                            cols: 3,
                            target: '_blank'
                        });

                    elementsToUpdate['#album-posts'] = postHtml;
                    io.sockets.in('album-' + albumId).emit('album-update', [{
                        action: 'append',
                        elements: elementsToUpdate
                    }]);

                    next(err);

                });
        }}, function(err, results) {
            if (!!callback) callback(err, album);
        });
    });
};
module.exports.assignPostToAlbum = assignPostToAlbum;
