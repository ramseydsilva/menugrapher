'use strict';

process.env['MONGODB'] = 'mongodb://localhost:27017/mytestdb';
process.env.PORT = 4000;

var request = require('supertest'),
    superagent = require('superagent'),
    jsdom = require('jsdom'),
    should = require('should'),
    ss = require('socket.io-stream'),
    async = require('async'),
    app = require('../../app'),
    User = require('../../models/User'),
    Post = require('../../models/post'),
    City = require('../../models/city'),
    Restaurant = require('../../models/restaurant'),
    Category = require('../../models/category'),
    Item = require('../../models/item'),
    userFixture = require('../fixtures/user'),
    util = require('../util'),
    postUtil = require('./util'),
    jquery = require('fs').readFileSync("node_modules/jquery/dist/jquery.min.js", "utf-8"),
    user;

var agent = superagent.agent();

describe('GET /users', function() {
    before(function(done) {
        util.before(
            function(next) {
                util.loadFixture(User, userFixture.user, next);
            }
        , function(err, results) {
            user = results[1];
            done(err);
        });
    });

    function uploadImage(socket) {
        console.log('sending image!!!!!');
        var stream = ss.createStream();
        ss(socket).emit('image-upload', stream, {
            elementId: '123',
            link: 'http://i.imgur.com/u40WWLD.jpg',
            city: 'Toronto',
            restaurant: 'Salad King',
            category: 'Thai',
            item: 'Noodles',
            album: false
        });
    };

    it('Anonymous user cannot post image, permission denied', function(done) {
        util.getSocketClient(app, function(socket) {
            socket.once('connect', function() {
                uploadImage(socket);
            });
            socket.once('post1', function(data) {
               data.error.should.be.equal('Permission denied');
               socket.disconnect();
               done();
            });
        });
    });

    it('Upload link from website creates new post, ensuring proper linkage', function(done) {
        util.getAuthenticatedSocketClient(app, {email: userFixture.user.email, password: userFixture.user.password}, function(socket) {
            socket.on('connect', function() {
                uploadImage(socket);
            });
            socket.on('post-update', function(data) {
                async.parallel([
                    function(next) {
                        Post.find({}, function(err, posts) {
                            posts.length.should.be.exactly(1);
                            next(err, posts[0]);
                        });
                    },
                    function(next) {
                        postUtil.ensureCityRestaurantCategoryItemLinkage('Toronto', 'Salad King', 'Thai', 'Noodles', function(err, results) {
                            next(err, results);
                        });
                    }
                ], function(err, results) {
                    socket.disconnect();
                    done(err);
                    var post = results[0];
                    var attrs = results[1];
                });
            });
        });
    });

    after(util.after);

});
