'use strict';

var util = require('../util'),
    async = require('async'),
    Album = require('../../models/album'),
    _ = require('underscore'),
    userUtil = require('../user/util'),
    cityUtil = require('../city/util'),
    restaurantUtil = require('../restaurant/util'),
    categoryUtil = require('../category/util'),
    albumFixture = require('../fixtures/db/album');

var loadAlbums = function(next) {
    var albums = [];
    _.each(albumFixture.albums, function(album) {
        util.loadFixture(Album, album, function(err, doc) {
            if (err) next(err);
            albums.push(doc);
            if (albums.length == albumFixture.albums.length)
                next(err, albums);
        });
    });
};
module.exports.loadAlbums = loadAlbums;

var loadAlbum = function(next) {
    async.parallel({
        users: function(next) {
            userUtil.loadUsers(next);
        },
        cities: function(next) {
            cityUtil.loadCities(next);
        },
        restaurants: function(next) {
            restaurantUtil.loadRestaurants(next);
        },
        categories: function(next) {
            categoryUtil.loadCategories(next);
        },
        albums: function(next) {
            loadAlbums(next);
        }
    }, function(err, results) {
        next(err, results);
    });
}
module.exports.loadAlbum = loadAlbum;
