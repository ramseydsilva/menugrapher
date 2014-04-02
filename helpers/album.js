'use strict';

var album = require('../models/album');

module.exports.deleteAlbum = function(options, force, socket, callback) {
    album.findOne(options, function(err, doc) {
        if (!!doc) {
            var element = {};
            element['#album-' + doc._id ] = '';

            // IF album is empty or if forceful delete
            if (!!force || doc.pics.length == 0) {
                console.log('deleting album', doc);
                album.remove(function(err, doc) {
                    console.log('album deleted', doc);
                    if (err) throw err;

                    socket.broadcast.emit('create-album', [{
                        action: 'remove',
                        elements: element
                    }]);

                    if (!!callback)
                        callback(err, doc);
                });
            }
        }
    });
};

var assignPostToAlbum = function(post, albumId, callback) {
    album.findOne({_id: albumId}, function(err, album) {
        console.log('found album', albumId, album);
        if (!!album) {
            album.pics.push(post);
            album.save(function(err, doc) {
                console.log('about to throw error', doc);
                if (err && err.name == 'VersionError') {
                    // VersionError is thrown when post item was saved concurrently, in which scenario, try resaving it
                    assignPostToAlbum(post, albumId, callback);
                } else if(err) {
                    throw err; // Throw any other error
                }

                if (!!callback)
                    callback(err, doc);
            });
        }
    });
};
module.exports.assignPostToAlbum = assignPostToAlbum;
