'use strict';

var Album = require('../../models/album'),
    should = require('should'),
    socketer = require('socketer'),
    util = require('../util'),
    async = require('async'),
    albumUtil = require('./util'),
    app = require('../../app'),
    cityFixture = require('../fixtures/db/city'),
    request = require('supertest');

var album, user;

describe('Album ', function(done) {
    before(function(done) {
        util.loadDb(
            function(next) {
                albumUtil.loadAlbum(next);
            },
            function(err, results) {
                album = results[1].albums[0];
                user = results[1].users[0];
                var opts = {
                    _user: results[1].users[0]._id,
                    _city: results[1].cities[0]._id,
                    _restaurant: results[1].restaurants[0]._id,
                    _category: results[1].categories[0]._id
                };
                Album.findByIdAndUpdate(album._id, opts).populate('_restaurant').populate('_city').populate('_category').exec(function(err, doc) {
                album = doc;
                done(err);
            });
        });
    });

    it('cannot be edited by anonymous user', function(done) {
        async.parallel([
            function(next) {
                socketer.anonRequest(app, album.editUrl, function(err, res) {
                    res.statusCode.should.be.exactly(403);
                    next(err);
                });
            },
            function(next) {
                socketer.anonRequest(app, album.deleteUrl, function(err, res) {
                    res.statusCode.should.be.exactly(403);
                    next(err);
                });
            },
            function(next) {
                socketer.authRequest(app, album.editUrl, {email: user.email, password: user.profile.passwordString}, function(err, res) {
                    res.statusCode.should.be.exactly(200);
                    next(err);
                });
            }
        ], function(err, results) {
            done(err);
        });
    });

    it('edit page displays correct values', function(done) {
        socketer.authRequest(app, album.editUrl, {email: user.email, password: user.profile.passwordString}, function(err, res) {
            res.body.should.containEql(album._restaurant.name);
            res.body.should.containEql(album._city.name);
            res.body.should.containEql(album._category.name);
            done(err);
        });
    });

    it('delete page deletes post', function(done) {
        socketer.authRequest(app, album.deleteUrl, {email: user.email, password: user.profile.passwordString}, function(err, res) {
            done(err);
        });
    });

    after(util.after);

});
