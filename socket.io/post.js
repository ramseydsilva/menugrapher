'use strict';

var Post = require('../models/post'),
    _ = require('underscore'),
    gm = require('gm'),
    path = require('path'),
    fs = require('fs'),
    async = require('async'),
    ss = require('socket.io-stream'),
    postHelpers = require('../helpers/post'),
    albumHelpers = require('../helpers/album'),
    album = require('../models/album'),
    postSocket = {};

/** This socket handles the post update page. It allows all users
 * logged in or anonymous to create city, restaurant, category, items
 * and ensure proper linkage. Successively, if user has logged in and is the owner
 * of the post in question, it allows an edit. Succisevely, it sends updated
 * post information to all post client listeners.
 */
postSocket.update = function(socket, callback) {
    socket.on('post-update', function(data) {
        Post.findOne({ _id: data.id }, function(err, post) {
            async.parallel([
                function(next) {
                    postHelpers.getOrCreateCityRestaurantCategoryItem(data.city, data.restaurant, data.category, data.item, next);
                }
            ], function(err, results) {
                if (post) {
                    if (post._user.id == socket.handshake.user.id) {
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
                    } else {
                        socket.emit('post', {error: 'Permission denied'});
                    }
                } else {
                    socket.emit('post', {error: 'Post not found'});

                    if (!!callback)
                        callback(err, post);

                }
            });
        });
    });
};

/** This socket fires when user either checks or uncheckes
 * the create album checkbox. If an album id has been specified,
 * then it does nothing. Successively, it either broadcast add or remove
 * event to all album user client sockets.
 */
postSocket.createAlbumCheckBox = function(socket, io, callback) {
    socket.on('create-album', function(data) {
        if (!!!socket.handshake.user) {
            socket.emit('album', {error: 'Permission denied'});
        } else {
            if (!!data.create) {
                // Create album checked
                // First find if album already exists given the albumId
                async.waterfall([
                    function(next) {
                        album.findOne({ _id: data.album}, function(err, doc) {
                            next(null, doc);
                        });
                    },
                    function(existingAlbum, next) {
                        if (!!!existingAlbum) {
                            // Can't find album, create new one but first query for previously created albums starting with 'Album '
                            album.findOne({name: /^Album\ /i, _user:socket.handshake.user.id}, {}, { sort: {'_id' : -1}}, function(err, previousAlbum) {
                                var name = 'Album 1';
                                if (!!previousAlbum && previousAlbum.name) {
                                    name = previousAlbum.name.replace(/[0-9]+(?!.*[0-9])/, parseInt(previousAlbum.name.match(/[0-9]+(?!.*[0-9])/), 10)+1);
                                }
                                album.create({ name: name, _user: socket.handshake.user.id, '_meta.socketId': socket.id}, function(err, doc) {
                                    if (err) throw err;

                                    socket.emit("post-update", [{
                                        action: 'val',
                                        elements: {
                                            '#album': doc._id
                                        }
                                    }]);

                                    var elements = {};
                                    elements['#userAlbums-' + doc._user] = "<a href='" + doc.url + "' class='list-group-item' id='album-" + doc._id + "'>" + doc.name + "</a>";
                                    io.sockets.in('albums-user-' + doc._user).emit('create-album', [{
                                        action: 'append',
                                        elements: elements
                                    }]);

                                    next(err, doc);
                                });
                            });
                        } else {
                            next(null, existingAlbum);
                        }
                    },
                ], function(err, result) {
                    if (!!callback)
                        callback(err, result);
                });
            } else {
                // Create album unchecked, delete only if album is empty
                if (!!data.album) {
                    albumHelpers.deleteAlbumIfEmpty({_id: data.album, _user: socket.handshake.user.id}, io);
                }
            }
        }
    });
};

/** Delete album created by the upload picture socket only
 * if it contains no pictures. This usually happens when the
 * user checks Create album toggle then navigates off the page.
 * Successively it sends remove album info to all client socket
 * album listeners.
 */
postSocket.deleteAlbum = function(socket, io, callback) {
    socket.on('disconnect', function(stream, data) {
        albumHelpers.deleteAlbumIfEmpty({ _user: socket.handshake.user.id, '_meta.socketId': socket.id}, io);
    });
};

/** This socket will allow logged in user to upload
 * an image either individually or as an album. It
 * checks if the album flag has been checked to true.
 * If an album id is also specified, it adds the pictures
 * to the album. It also gathers city, restaurant, category
 * and item information and attaches it to the uploaded images
 * but not to the album (TODO)
 * If image has been uploaded to album, it sends new image information
 * to all client socket album listeners.
 */
postSocket.imageUpload = function(socket, io, callback) {
    ss(socket).on('image-upload', function(stream, data) {
        if (!!!socket.handshake.user) {
            post.emit('post', {error: 'Permission denied'});
        } else {
            var filename, elementId = data.elementId;

            if (!!data.link) {
                filename = path.basename(data.link).split('?')[0];
            } else {
                filename = path.basename(data.name.name);
            }
            async.waterfall([
                function(next) { // get file path
                    postHelpers.getFilePath(filename, 'original', socket.handshake.user, function(err, filepath) {
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
                async.parallel({
                    post: function(next) {
                        postHelpers.getOrCreateCityRestaurantCategoryItem(data.city, data.restaurant, data.category, data.item, next);
                    },
                    thumb: function(next) {
                        postHelpers.getFilePath(path.basename(filepath), 'thumb/240x160', socket.handshake.user, function(err, thumbPath) {
                            gm(filepath).resize(240, 160, '!').gravity('Center').crop(240, 160, 0, 0).write(thumbPath, function(err) {
                                if (err) throw err;
                                postHelpers.getImageUrl(thumbPath, function(url){
                                    next(null, { path: thumbPath, url: url });
                                });
                            });
                        });
                    }
                }, function(err, results) {
                    postHelpers.newPost({
                        user: {
                            _id: socket.handshake.user.id,
                            name: socket.handshake.user.profile.name
                        },
                        _user: socket.handshake.user.id,
                        pic: {
                            originalPath: filepath,
                            originalUrl: url,
                            thumbPath: results.thumb.path,
                            thumbUrl: results.thumb.url,
                        },
                        _city: results.post.city.id,
                        _restaurant: results.post.restaurant.id,
                        _category: results.post.category.id,
                        _item: results.post.item.id
                    }, socket, elementId, function(err, post) {

                        // Assign to album
                        if (!!data.album) {
                            albumHelpers.assignPostToAlbum(post, data.album, socket.handshake.user, io, function(err, doc) {
                                if (!!callback)
                                    callback(err, post, doc)
                            });
                        }
                    });
                });
            });
        }
    });
};

/** This socket handles removal of post. It checks first
 * if the user has permission to the post
 */
postSocket.remove = function(io, socket, callback) {
    socket.on('post:remove', function(data) {
        if (!!!socket.handshake.user) {
            socket.emit('post', {error: 'Permission denied'});
        } else {
            Post.findOneAndRemove({_id: data.id, '_user': socket.handshake.user.id}, function(err, post) {
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
                } else {
                    socket.emit('post', {error: 'Post not found'});
                }

                if (!!callback)
                    callback(err, post);
            });
        }
    });
};

/** This socket handles user events on the post upload page, when they
 * delete any of the city, restaurant, category attributes by clicking
 * on the delete icon. It then updates the post realtime to all post listeneners
 */
postSocket.removeAttr = function(socket, attr, callback) {
    socket.on('post.' + attr + ':remove', function(data) {
        Post.findOne({_id: data.id, '_user': socket.handshake.user.id}, function(err, post) {
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
    postSocket.imageUpload(socket, io);
    postSocket.createAlbumCheckBox(socket, io);
    postSocket.deleteAlbum(socket, io);
    postSocket.remove(io, socket);
    postSocket.removeAttr(socket, '_city');
    postSocket.removeAttr(socket, '_restaurant');
    postSocket.removeAttr(socket, '_category');
};

module.exports = postSocket;
