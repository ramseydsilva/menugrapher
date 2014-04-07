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

var populatePostOptsWithAlbumValues = function(dict, album, opts, callback) {
    if ((!dict.city.name || !dict.restaurant.name || !dict.category.name) && album) {
        if (!!album._city && !dict.city.name)
            opts['_city'] = album._city;
        if (!!album._restaurant && !dict.restaurant.name)
            opts['_restaurant'] = album._restaurant;
        if (!!album._category && !dict.category.name)
            opts['_category'] = album._category;
    }
    callback(null, opts);
};
module.exports.populatePostOptsWithAlbumValues = populatePostOptsWithAlbumValues;

var socketCreateAlbum = function(album, socket, io, callback) {
    var to_return = [];
    to_return.push({ action: 'val', elements: { '#album': album._id } });
    fs.readFile(path.join(app.get('views'), 'album/includes/albumHeader.jade'), 'utf8', function (err, data) {
        if (err) throw err;
        var elementsToUpdate = {},
            fn = jade.compile(data),
            html = fn({ 'album': album, 'user': socket.handshake.user });
        to_return.push({ action: 'before', elements: { '#uploadsParent': html } });
        socket.emit("create-album", to_return);
    });
    var elements = {};
    elements['#userAlbums-' + album._user] = "<a href='" + album.url + "' class='list-group-item' id='album-" + album._id + "'>" + album.name + "</a>";
    io.sockets.in('albums-user-' + album._user).emit('create-album', [{
        action: 'append',
        elements: elements
    }]);

    if (!!callback) callback(null, album);

};
module.exports.socketCreateAlbum = socketCreateAlbum;

var createAlbum = function(socket, io, callback) {
    // Can't find album, create new one but first query for previously created albums starting with 'Album '
    Album.findOne({name: /^Album\ /i, _user: socket.handshake.user.id}, {}, { sort: {'_id' : -1}}, function(err, previousAlbum) {
        var name = 'Album 1';
        if (!!previousAlbum && previousAlbum.name) {
            name = previousAlbum.name.replace(/[0-9]+(?!.*[0-9])/, parseInt(previousAlbum.name.match(/[0-9]+(?!.*[0-9])/), 10)+1);
        }
        Album.create({ 
            name: name, 
            _user: socket.handshake.user.id,
            '_meta.socketId': socket.id
        }, function(err, album) {
            if (err) throw err;
            socketCreateAlbum(album, socket, io, function(err, album) {
                if (!!callback) callback(null, album);
            });
        });
    });
};
module.exports.createAlbum = createAlbum;

var createOrGetAlbum = function(albumId, socket, io, callback) {
    if (!!albumId) {
        Album.findOne({ _id: albumId, _user: socket.handshake.user.id}, callback);
    } else {
        createAlbum(socket, io, callback);
    }
};
module.exports.createOrGetAlbum = createOrGetAlbum;

var deleteAlbum = function(options, force, socket, io, callback) {
    Album.findOne(options, function(err, album) {
        if (!!album) {
            var element = {};
            element['#album-' + album._id ] = '';

            // IF album is empty or if forceful delete
            if (!!force || album.pics.length == 0) {
                album.remove(function(err, doc) {
                    if (err) throw err;

                    socket.emit('create-album', [{
                        action: 'remove',
                        elements: {'#albumHeader': ''}
                    }, { action: 'val',
                        elements: {'#album': ''}
                    }]);

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

var assignPostToAlbum = function(post, album, currentUser, io, callback) {
    if (!!album) {
        album.update({ $addToSet: {pics: post._id}}, function(err, numberUpdated) {
            if (!!numberUpdated) { // Check if post was added if doesn't already exist
                async.parallel({
                    assignRestaurantCityCategory: function(next) {
                        if (!!!album._restaurant && post._restaurant)
                            album._restaurant = post._restaurant;
                        if (!!!album._city && post._city)
                            album._city = post._city;
                        if (!!!album._category && post._category)
                            album._category = post._category;
                        console.log(album);
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
                            io.sockets.in('album-' + album._id).emit('album-update', [{
                                action: 'append',
                                elements: elementsToUpdate
                            }]);

                            next(err);

                        });
                }}, function(err, results) {
                    if (!!callback) callback(err, {post: post, album: album});
                });
            } else {
                if (!!callback) callback(err, {post: post, album: album});
            }
        });
    } else {
        if (!!callback) callback(null, {post: post, album: album});
    }
};
module.exports.assignPostToAlbum = assignPostToAlbum;
