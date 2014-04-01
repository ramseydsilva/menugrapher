'use strict';

var Post = require('../models/post'),
    _ = require('underscore'),
    path = require('path'),
    fs = require('fs'),
    async = require('async'),
    ss = require('socket.io-stream'),
    postHelpers = require('../helpers/post'),
    postSocket = {};


postSocket.update = function(socket, callback) {
    socket.on('post-update', function(data) {
        Post.findOne({ _id: data.id }, function(err, post) {
            async.parallel([
                function(next) {
                    postHelpers.getOrCreateCityRestaurantCategoryItem(data.city, data.restaurant, data.category, data.item, next);
                }
            ], function(err, results) {
                post.title = data.title;
                post.description = data.description;
                post._city = results[0].city.id;
                post._category = results[0].category.id;
                post._restaurant = results[0].restaurant.id;
                post._item = results[0].item.id;

                post.save(function(err, post, numberAffected) {
                    // Emit to socket instructing refresh
                    socket.emit('post-update', [{
                        action: 'redirect',
                        url: post.url
                    }]);

                    // All other clients with this post should update their info
                    Post.findOne({ _id: post._id }).populate('_city').populate('_restaurant').populate('_category').exec(function(err, post) {
                        var elementsToUpdate = {};
                        elementsToUpdate['#' + post.id + ' .post-title'] = post.title;
                        elementsToUpdate['#' + post.id + ' .post-description'] = post.description;
                        elementsToUpdate['#' + post.id + ' ._city'] = post._city.name;
                        elementsToUpdate['#' + post.id + ' ._restaurant'] = post._restaurant.name;
                        elementsToUpdate['#' + post.id + ' ._category'] = post._category.name;

                        socket.broadcast.to('post-' + post.id).emit('post-update', [{
                            action: 'html',
                            elements: elementsToUpdate
                        }]);

                        if (!!callback)
                            callback(err, post);
                    });

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
                    postHelpers.getOrCreateCityRestaurantCategoryItem(data.city, data.restaurant, data.category, data.item, next);
                }
            ], function(err, results) {
                postHelpers.newPost({
                    user: {
                        uid: socket.handshake.user.id,
                        name: socket.handshake.user.profile.name
                    },
                    _user: socket.handshake.user.id,
                    pic: {
                        originalPath: filepath,
                        originalUrl: url,
                        thumbPath: "",
                        thumbUrl: "",
                    },
                    _city: results[0].city.id,
                    _restaurant: results[0].restaurant.id,
                    _category: results[0].category.id,
                    _item: results[0].item.id
                }, socket, elementId, function(err, post) {

                    if (!!callback)
                        callback(err, post);

                });
            });

        });
    });

};

postSocket.remove = function(io, socket, callback) {
    socket.on('post:remove', function(data) {
        Post.findOneAndRemove({_id: data.id, 'user.uid': socket.handshake.user.id}, function(err, post) {
            if (!!post) {
                post.remove();
                var elements = {};
                elements['#' + data.id] = 'Post deleted';

                // if in new post page, remove element
                io.sockets.in('post-new-' + post.id).emit('post-update', [{
                    action: 'remove',
                    elements: elements
                }]);

                // Redirect if on post delete page
                io.sockets.in('post-delete-' + post.id).emit('post-update', [{
                    action: 'redirect',
                    url: socket.handshake.user.url
                }]);
            }

            if (!!callback)
                callback(err, post);
        });
    });
};

postSocket.removeAttr = function(socket, attr, callback) {
    socket.on('post.' + attr + ':remove', function(data) {
        Post.findOne({_id: data.id, 'user.uid': socket.handshake.user.id}, function(err, post) {
            post[attr] = null;
            post.save(function(err, doc) {
                var elements = {};
                elements['#' + data.id + ' .' + attr ] = "";
                socket.to('post-' + data.id).emit('post-update', [{
                    action: 'html',
                    elements: elements
                }]);

                if (!!callback)
                    callback(err, post);
            });
        });
    });
};

// Enables socket connection for post methods
postSocket.socket = function(io, socket, app) {
    postSocket.update(socket);
    postSocket.imageUpload(socket);
    postSocket.remove(io, socket);
    postSocket.removeAttr(socket, '_city');
    postSocket.removeAttr(socket, '_restaurant');
    postSocket.removeAttr(socket, '_category');
};

module.exports = postSocket;
