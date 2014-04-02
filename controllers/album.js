'use strict';

var async = require('async'),
    breadcrumb = require('../helpers/breadcrumb'),
    Album = require('../models/album');

exports.album = function(req, res) {
    var album = res.locals.album;
    var breadcrumbs = [breadcrumb.home(), breadcrumb.albums(), breadcrumb.album(album, 'active')];
    Album.find({_user: album._user}, function(err, albums) {
        res.render('home/album', {
            title: 'Album | ' + album.name,
            breadcrumbs: breadcrumbs,
            userAlbums: albums
        });
    });
};
