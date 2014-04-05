'use strict';

var Album = require('../models/album'),
    Post = require('../models/post'),
    async = require('async'),
    postHelpers = require('../helpers/post'),
    albumSocket = {};

albumSocket.update = function(socket) {
    socket.on('album-update', function(data) {
        if (!!!socket.handshake.user.id) {
            socket.emit('album-update', { error: 'Permission denied' });
        } else {
            Album.findOne({_id: data.id, _user: socket.handshake.user.id}, function(err, album) {
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
};

module.exports = albumSocket;
