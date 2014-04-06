'use strict';

var Album = require('../../models/album'),
    Post = require('../../models/post'),
    should = require('should'),
    socketer = require('socketer'),
    util = require('../util'),
    async = require('async'),
    albumUtil = require('./util'),
    app = require('../../app'),
    cityFixture = require('../fixtures/db/city'),
    request = require('supertest'),
    ss = require('socket.io-stream'),
    Post = require('../../models/post'),
    util = require('../util'),
    socketer = require('socketer'),
    fs = require('fs');

describe('On adding pictures to album', function(done) {
    var postData = {
        elementId: '123',
        link: 'http://i.imgur.com/u40WWLD.jpg',
        city: 'Toronto',
        restaurant: 'Salad King',
        category: 'Thai',
        item: 'Noodles',
        album: ''
    }, album, post, user;

    function uploadImage(socket, postData) {
        var stream = ss.createStream();
        ss(socket).emit('image-upload', stream, postData);
        if (!!postData.name) {
            var blobStream = fs.createReadStream(postData.name.name);
            blobStream.pipe(stream);
        }
    };

    before(function(done) {
        util.loadDb(
            function(next) {
                albumUtil.loadAlbum(next);
            }, function(err, results) {
                album = results[1].albums[0];
                user = results[1].users[0];
                album._user = results[1].users[0];
                album._restaurant = results[1].restaurants[1];
                album._city = results[1].cities[1];
                album._category = results[1].categories[1];
                album.save(function(err, doc) {
                    album = doc;
                    done(err);
                });
        });
    });

    it('doesn\'t inherit the attributes of the album, when its own values are present', function(done) {
        socketer.authSocket(app, {email: user.email, password: user.profile.passwordString}, function(authSocket) {
            postData['album'] = album._id;
            uploadImage(authSocket, postData);

            authSocket.once('post-update', function(data) {
                authSocket.disconnect();
                Post.find({}, function(err, posts) {
                    post = posts[0];
                    post._restaurant.should.not.be.eql(album._restaurant);
                    done(err);
                });
            });
        });
    });

    it('inherits the attributes of the album, namely the category, restaurant, city if empty', function(done) {
        socketer.authSocket(app, {email: user.email, password: user.profile.passwordString}, function(authSocket) {
            postData['album'] = album._id;
            postData.city = '';
            postData.restaurant = '';
            postData.category = '';
            uploadImage(authSocket, postData);

            authSocket.once('post-update', function(data) {
                authSocket.disconnect();
                Post.find({}, function(err, posts) {
                    post = posts[1];
                    post._restaurant.should.be.eql(album._restaurant);
                    done(err);
                });
            });
        });
    });

    after(util.after);
});
