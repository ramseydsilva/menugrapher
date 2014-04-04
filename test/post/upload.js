'use strict';

var request = require('supertest'),
    superagent = require('superagent'),
    _ = require('underscore'),
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
    socketer = require('socketer'),
    fs = require('fs'),
    jquery = fs.readFileSync("node_modules/jquery/dist/jquery.min.js", "utf-8"),
    user;

var agent = superagent.agent(),
    user;

describe('Image uploading works', function() {
    var postLinkData = {
        elementId: '123',
        link: 'http://i.imgur.com/u40WWLD.jpg',
        city: 'Toronto',
        restaurant: 'Salad King',
        category: 'Thai',
        item: 'Noodles',
        album: false
    };

    var postImageData = {
        elementId: '456',
        name: {
            name: 'test/fixtures/poulet-roti.jpg',
            webkitRelativePath: ''
        },
        size: fs.statSync('test/fixtures/poulet-roti.jpg').size,
        city: 'Paris',
        restaurant: 'Petit France',
        category: 'French',
        item: 'Poulet roti',
        album: false
    };

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
                util.loadFixture(User, userFixture.user, next);
            }
        , function(err, results) {
            user = results[1];
            done(err);
        });
    });

    it('Anonymous user cannot post image, permission denied', function(done) {
        socketer.anonSocket(app, function(socket) {
            socket.once('connect', function() {
                uploadImage(socket, postLinkData);
            });
            socket.once('post', function(data) {
                socket.disconnect(); // Free the socket
               data.error.should.be.equal('Permission denied');
               done();
            });
        });
    });

    var newPostTests = [{
        name: 'New post can be created via link from internet, ensuring proper linkage',
        postData: postLinkData
    },{
        name: 'New post can be created via image upload, ensuring proper linkage',
        postData: postImageData
    }];

    _.each(newPostTests, function(testInfo) {
        describe(testInfo.name, function() {
            var post, postHtml, socket, postData = testInfo.postData;

            before(function(done) {
                util.loadDb(
                    function(next) {
                        util.loadFixture(User, userFixture.user, next);
                    }
                , function(err, results) {
                    user = results[1];

                    socketer.authSocket(app, {email: userFixture.user.email, password: userFixture.user.password}, '/login', function(authSocket) {
                        socket = authSocket;
                        socket.once('connect', function() {
                            uploadImage(socket, postData);
                        });
                        socket.once('post-update', function(data) {
                            socket.disconnect(); // Free the socket
                            Post.find({}, function(err, posts) {
                                post = posts[0];
                                postHtml = data[0].elements['#' + postData.elementId];
                                done();
                            });
                        });
                    });
                });
            });

            it('Post was created via link upload', function() {
                post._id.should.be.ok;
            });

            it('Test to see image uploaded correctly and thumb was generated', function() {
                post.pic.originalPath.should.be.ok;
                post.pic.originalUrl.should.be.ok;
                post.pic.thumbPath.should.be.ok;
                post.pic.thumbUrl.should.be.ok;
                fs.existsSync(post.pic.originalPath).should.be.true;
                fs.existsSync(post.pic.thumbPath).should.be.true;
            });

            it('Thumb is smaller than original image', function() {
                fs.statSync(post.pic.thumbPath).size.should.be.lessThan(fs.statSync(post.pic.originalPath).size);
            });

            it('Correct post user', function() {
                post._user.should.be.eql(user._id);
            });

            it('Ensure correct City, Restaurant, Category, Item linkage', function(done) {
                postUtil.ensureCityRestaurantCategoryItemLinkage(postData.city, postData.restaurant, postData.category, postData.item, function(err, results) {
                    done(err, results);
                });
            });

            it('Post html should contain city, restaurant, category names', function() {
                postHtml.should.containEql(postData.city);
                postHtml.should.containEql(postData.restaurant);
                postHtml.should.containEql(postData.category);
            });

            it('Post html should contain 4 edit buttons and 4 delete buttons', function() {
                postHtml.match(/fa-times/g).length.should.be.exactly(4);
                postHtml.match(/fa-pencil/g).length.should.be.exactly(4);
            });

            it('Post html should contain thumb url', function() {
                postHtml.should.containEql(post.pic.thumbUrl);
            });

            after(function(done) {
                post.remove(done);
            });
        });
    });

    after(util.after);

});