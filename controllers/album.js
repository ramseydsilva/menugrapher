'use strict';

var async = require('async'),
    breadcrumb = require('../helpers/breadcrumb'),
    moment = require('moment'),
    Album = require('../models/album');

exports.album = function(req, res) {
    var album = res.locals.album;
    var breadcrumbs = [breadcrumb.home(), breadcrumb.albums(), breadcrumb.album(album, 'active')];
    Album.find({_user: album._user}).sort('-_id').exec(function(err, albums) {
        res.render('album/album', {
            title: 'Album | ' + album.name,
            breadcrumbs: breadcrumbs,
            userAlbums: albums,
            time: moment(album.createdAt).fromNow()
        });
    });
};

exports.edit = function(req, res) {
    var album = res.locals.album;
    var breadcrumbs = [breadcrumb.home(), breadcrumb.albums(), breadcrumb.album(album, 'active'),
        { text: 'Edit', url: album.editUrl, class: 'active'} ];

    res.render('album/edit', {
        title: "Edit Album",
        breadcrumbs: breadcrumbs,
        back: {
            text: 'Back to Album',
            href: album.url
        }
    });
};

exports.delete = function(req, res) {
    var album = res.locals.album;
    var breadcrumbs = [breadcrumb.home(), breadcrumb.albums(), breadcrumb.album(album, 'active'),
        { text: 'Delete', url: album.deleteUrl, class: 'active'} ];

    res.render('album/delete', {
        title: "Edit Album",
        breadcrumbs: breadcrumbs,
        back: {
            text: 'Back to Album',
            href: album.url
        }
    });
};
