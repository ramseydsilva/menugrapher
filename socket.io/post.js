'use strict';

var Post = require('../models/post'),
    path = require('path'),
    fs = require('fs'),
    async = require('async'),
    ss = require('socket.io-stream'),
    postHelpers = require('../helpers/post'),
    postSocket = {};


postSocket.update = function(socket, callback) {
    socket.in('post').on('post-update', function(data) {
        Post.findOne({ _id: data.id }, function(err, post) {
            async.parallel([
                function(next) {
                    postHelpers.getOrCreateCityRestaurantCategory(data.city, data.restaurant, data.category, next);
                }
            ], function(err, results) {
                post.title = data.title;
                post.description = data.description;
                post._city = results[0].city.id;
                post._category = results[0].category.id;
                post._restaurant = results[0].restaurant.id;

                post.save(function(err, post, numberAffected) {
                    socket.in('post-'+ post.id).emit('post-update', [{
                        action: 'redirect',
                        url: post.url
                    }]);  // Emit to emitting socket, get them to redirect to post page on successful edit

                    var elementsToUpdate = {};
                    elementsToUpdate['#' + post.id + ' .post-title'] = post.title;
                    elementsToUpdate['#' + post.id + ' .post-description'] = post.description;

                    socket.broadcast.to('post-' + post.id).emit('post-update', [{
                        action: 'html',
                        elements: elementsToUpdate
                    }]);  // Emit to other sockets to update their info

                    if (!!callback)
                        callback(err, post);

                });
            });
        });
    });
};

postSocket.imageUpload = function(socket, callback) {
    ss(socket).on('image-upload', function(stream, data) {
        var filename, elementId = data.elementId;

        if (!!data.link) {
            filename = path.basename(data.link).split('?')[0];
        } else {
            filename = path.basename(data.name.name);
        }

        async.waterfall([
            function(next) { // get file path
                postHelpers.getFilePath(filename, socket.handshake.user, function(err, filepath) {
                    next(null, filepath);
                });
            },
            function(filepath, next) { // get url
                postHelpers.getImageUrl(filepath, function(url){
                    next(null, filepath, url);
                });
            },
            function(filepath, url, next) { // start stream
                if (!!data.link) {
                    var http = require('http'),
                        https = require('https'),
                        download = fs.createWriteStream(filepath);

                    var httpProtocol = !data.link.indexOf('https') ? https : http;
                    var httpStream = httpProtocol.get(data.link, function(res) {
                        res.pipe(download);
                        var totalSize = res.headers['content-length'];
                        var downloadedSize = 0;
                        res.on('data', function(buffer) {
                            downloadedSize += buffer.length;
                            socket.emit('downloadProgress', {'progress': downloadedSize/totalSize * 100 + '%' });
                        });
                    });
                    download.on('finish', function(err, data) { 
                        next(err, filepath, url, elementId);
                    });
                } else {
                    var upload = fs.createWriteStream(filepath);
                    stream.pipe(upload);
                    stream.on('end', function(err, data) {
                        next(err, filepath, url, elementId);
                    });
                }
            }
        ], function(err, filepath, url, elementId) {

            // Create city, restaurant, category first before saving post
            async.parallel([
                function(next) {
                    postHelpers.getOrCreateCityRestaurantCategory(data.city, data.restaurant, data.category, next);
                }
            ], function(err, results) {
                postHelpers.newPost({
                    user: {
                        uid: socket.handshake.user.id,
                        name: socket.handshake.user.profile.name
                    },
                    pic: {
                        originalPath: filepath,
                        originalUrl: url,
                        thumbPath: "",
                        thumbUrl: "",
                    },
                    _city: results[0].city.id,
                    _restaurant: results[0].restaurant.id,
                    _category: results[0].category.id
                }, socket, elementId, function(err, post) {

                    if (!!callback)
                        callback(err, post);

                });
            });

        });
    });

};

postSocket.remove = function(socket, callback) {
    socket.in('post').on('post-delete', function(data) {
        var elements = {};
        elements['#' + data.id] = 'Post deleted';

        socket.to('post-' + data.id).emit('post-remove', [{
            action: 'html',
            elements: elements
        }]);
    });
};

// Enables socket connection for post methods
postSocket.socket = function(socket, app) {
    postSocket.update(socket);
    postSocket.imageUpload(socket);
    postSocket.remove(socket);
};

module.exports = postSocket;
