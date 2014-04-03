'use strict';

var Album = require('../models/album'),
    app = require('../app'),
    fs = require('fs'),
    path = require('path'),
    jade = require('jade');

var deleteAlbumIfEmpty = function(options, io, callback) {
    // Don't force delete if the album has pictures
    deleteAlbum(options, false, io, callback);
};

module.exports.deleteAlbumIfEmpty = deleteAlbumIfEmpty;

var deleteAlbum = function(options, force, io, callback) {
    Album.findOne(options, function(err, album) {
        if (!!album) {
            var element = {};
            element['#album-' + album._id ] = '';

            // IF album is empty or if forceful delete
            console.log('deleting album if empty', !!force, album.pics.length);
            if (!!force || album.pics.length == 0) {
                album.remove(function(err, doc) {
                    console.log('album deleted', doc);
                    if (err) throw err;

                    io.sockets.in('albums-user-' + doc._user).emit('create-album', [{
                        action: 'remove',
                        elements: element
                    }]);
                });
            }
        }
        if (!!callback)
            callback();
    });
};
module.exports.deleteAlbum = deleteAlbum;

var assignPostToAlbum = function(post, albumId, currentUser, io, callback) {
    Album.update({_id: albumId}, { $addToSet: {pics: post._id}}, function(err, album) {
        if (err && err.code == 11000) throw err; // E11000 is duplicate key error which can pass

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

            console.log('supposed to broadcast to album page', elementsToUpdate);

        });

        if (!!callback)
            callback(err, album);
    });
};
module.exports.assignPostToAlbum = assignPostToAlbum;
