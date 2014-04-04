'use strict';

var Album = require('../../models/album'),
    should = require('should'),
    util = require('../util'),
    async = require('async'),
    albumUtil = require('./util'),
    app = require('../../app'),
    cityFixture = require('../fixtures/db/city'),
    request = require('supertest');

var album;

describe('Album ', function(done) {
    before(function(done) {
        util.loadDb(
            function(next) {
                albumUtil.loadAlbum(next);
            }, 
            function(err, results) {
                album = results[1].albums[0];
                console.log(album);
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

    it('edit page displays correct values', function(done) {
        request(app).get(album.editUrl).expect(200, function(err, res) {
            res.text.should.containEql(album._restaurant.name);
            res.text.should.containEql(album._city.name);
            res.text.should.containEql(album._category.name);
            done(err);
        });
    });

    it('delete page deletes post', function(done) {
        request(app).get(album.deleteUrl).expect(200, function(err, res) {
            done(err);
        });
    });

    after(util.after);

});
