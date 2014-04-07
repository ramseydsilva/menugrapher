'use strict';

var Album = require('../models/album'),
    Post = require('../models/post'),
    async = require('async'),
    postHelpers = require('../helpers/post'),
    albumHelpers = require('../helpers/album'),
    _ = require('underscore'),
    albumSocket = {};

/** This socket fires when user either checks or uncheckes
 * the create album checkbox. If an album id has been specified,
 * then it does nothing. Successively, it either broadcast add or remove
 * event to all album user client sockets.
 */
albumSocket.createAlbumCheckBox = function(socket, io, callback) {
    socket.on('create-album', function(data) {
        if (!!!socket.handshake.user.id) {
            socket.emit('create-album', {error: 'Permission denied'});
        } else if (!!data.create) {
            albumHelpers.createOrGetAlbum(data.album, socket, io, function(err, album) {
                // Assign previously added pics to album
                if (!!data.pics) {
                    _.each(data.pics.split(','), function(pic) {
                        if (!!pic && album.pics.indexOf(pic) == -1) {
                            Post.findOne({_id: pic, _user: socket.handshake.user._id}, function(err, post) {
                                if (post) albumHelpers.assignPostToAlbum(post, album, socket.handshake.user, io);
                            });
                        }
                    });
                }
            });
        } else if (!!data.album && !!data.delete) {
            albumHelpers.deleteAlbum({_id: data.album, _user: socket.handshake.user.id}, true, socket, io);
        } else {
            socket.emit('create-album', {error: 'Permission denied'});
        }
    });
};

albumSocket.update = function(socket) {
    socket.on('album-update', function(data) {
        if (!!!socket.handshake.user.id) {
            socket.emit('album-update', { error: 'Permission denied' });
        } else {
            Album.findOne({_id: data.id, _user: socket.handshake.user.id}).populate('pics').exec(function(err, album) {
                if (err) throw err;
                if (album) {
                    async.parallel([
                        function(next) {
                            postHelpers.getOrCreateCityRestaurantCategoryItem(data.city, data.restaurant, data.category, data.item, next);
                        }
                    ], function(err, results) {
                        album.name = data.name;
                        album._city = results[0].city._id;
                        album._restaurant = results[0].restaurant._id;
                        album._category = results[0].category._id;
                        album.description = data.description;

                        if (!!data.applyToPost) {
                            async.each(album.pics, function(post, next) {
                                if (post.userHasRights(socket.handshake.user)) {
                                    var opts = {};
                                    opts['_city'] = results[0].city.id;
                                    opts['_category'] = results[0].category.id;
                                    opts['_restaurant'] = results[0].restaurant.id;
                                    postHelpers.updatePost(post, opts, socket, 'album', next);
                                }
                            });
                        }

                        album.save(function(err, doc) {
                            if (err) throw err;
                            socket.emit('album-update', [{
                                action: 'redirect',
                                url: album.url
                            }]);
                        });
                    });
                } else {
                    socket.emit('album-update', {
                        error: 'Album not found'
                    });
                }
            });
        }
    });
};

albumSocket.remove = function(socket) {
    socket.on('album-delete', function(data) {
        if (!!!socket.handshake.user.id) {
            socket.emit('album-delete', { error: 'Permission denied' });
        } else {
            Album.findOne({_id: data.id, _user: socket.handshake.user.id}).populate('_user').exec(function(err, album) {
                if (err) throw err;
                if (album) {
                    async.parallel({
                        deletePics: function(next) {
                            if (data.deletePics == 'true') {
                                Post.remove({ '_id': { $in: album.pics } }, function(err, result) {});
                            }
                            next();
                        },
                        deleteAlbum: function(next) {
                            album.remove(function(err, doc){
                                next(err);
                            });
                        }
                    }, function(err, results) {
                        socket.emit('album-delete', [{
                            action: 'redirect',
                            url: album._user.url
                        }]);
                    });
                } else {
                    socket.emit('album-delete', {
                        error: 'Album not found'
                    });
                }
            });
        }
    });
};

albumSocket.socket = function(io, socket, app) {
    albumSocket.update(socket);
    albumSocket.remove(socket);
    albumSocket.createAlbumCheckBox(socket, io);
};

module.exports = albumSocket;
