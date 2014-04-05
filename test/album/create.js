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
    Album = require('../../models/album'),
    Post = require('../../models/post'),
    City = require('../../models/city'),
    Restaurant = require('../../models/restaurant'),
    Category = require('../../models/category'),
    Item = require('../../models/item'),
    userFixture = require('../fixtures/db/user'),
    util = require('../util'),
    postUtil = require('../post/util'),
    socketer = require('socketer'),
    fs = require('fs'),
    jquery = fs.readFileSync("node_modules/jquery/dist/jquery.min.js", "utf-8"),
    user;

var agent = superagent.agent(),
    user;

describe('Create new album works', function() {
    var postLinkData = {
        elementId: '123',
        link: 'http://i.imgur.com/u40WWLD.jpg',
        city: 'Toronto',
        restaurant: 'Salad King',
        category: 'Thai',
        item: 'Noodles',
        album: ''
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
        album: ''
    };

    var postImageOnlyData = postImageData;
    postImageOnlyData['city'] = '';
    postImageData['restaurant'] = '';
    postImageData['category'] = '';
    postImageData['item'] = '';

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

    it('but anonymous user cannot create album, Permission denied', function(done) {
        socketer.anonSocket(app, function(socket) {
            socket.once('connect', function() {
                socket.emit('create-album', {
                    album: '',
                    create: true
                });
            });
            socket.once('create-album', function(data) {
                socket.disconnect(); // Free the socket
                data.error.should.be.equal('Permission denied');
                done();
            });
        });
    });

    describe('Empty album', function() {
        var data, socket, album;

        before(function(done) {
            socketer.authSocket(app, {email: userFixture.user.email, password: userFixture.user.password}, '/login', function(authSocket) {
                socket = authSocket;
                socket.once('connect', function() {
                    socket.emit('create-album', {
                        album: '',
                        create: true
                    });
                });
                socket.once('create-album', function(albumData) {
                    data = albumData;
                    Album.findOne({}, function(err, doc) {
                        album = doc;
                        done();
                    });
                });
            });
        });

        it('can be created by logged in user', function() {
            album._id.should.be.ok;
            album.name.should.be.ok;
            album.pics.length.should.be.exactly(0);
            data[0].elements.should.containEql({'#album': ''+album._id});
        });

        it('Empty album should be deleted on socket close', function(done) {
            socket.disconnect(); // Also frees up socket
            setTimeout(function() {
                Album.find({}, function(err, docs) {
                    docs.length.should.be.exactly(0);
                    done(err);
                });
            }, 500); // Wait half second to allow socket to disconnect
        });

    });

    var newAlbumTests = [{
        name: 'New album can be created via link from internet',
        postData: postLinkData
    },{
        name: 'New album can be created via image upload',
        postData: postImageData
    }, {
        name: 'New album can be created without city, restaurant, category, item info',
        postData: postImageOnlyData
    }];

    _.each(newAlbumTests, function(testInfo) {
        describe(testInfo.name, function() {
            var album, post, socket, postData = testInfo.postData;

            before(function(done) {
                socketer.authSocket(app, {email: userFixture.user.email, password: userFixture.user.password}, '/login', function(authSocket) {
                    socket = authSocket;

                    socket.once('connect', function() {
                        socket.emit('create-album', {
                            album: '',
                            create: true
                        });
                    });
                    socket.once('create-album', function(data) {
                        var albumId = data[0].elements['#album'];

                        Album.findOne({_id: albumId}, function(err, albumDoc) {
                            albumDoc._id.should.be.ok;
                            albumDoc.name.should.be.ok;
                            albumDoc.pics.length.should.be.exactly(0);

                            postData['album'] = albumId;
                            uploadImage(socket, postData);

                            socket.once('post-update', function(data) {
                                Post.find({}, function(err, posts) {
                                    post = posts[0];
                                    Album.findOne({_id: albumDoc._id}, function(err, doc) {
                                        album = doc;
                                        done();
                                    });
                                });
                            });
                        });
                    });
                });
            });

            it('and contain post', function() {
                album.pics.length.should.be.exactly(1);
                album.pics[0].should.be.eql(post._id);
            });

            it('and contain same attrs as post', function() {
                album._restaurant.should.be.eql(post._restaurant);
                album._city.should.be.eql(post._city);
                album._category.should.be.eql(post._category);
            });

            it('and album user should be current user', function() {
                album._user.should.be.eql(user._id);
            });

            it('and album link should work contain Image thumb, restaurant, category, city, and be subscribed to album and post room, but \
                no edit or delete links', function(done) {
                request(app).get(album.url).end(function(err, res) {
                    res.text.should.containEql(post.pic.thumbUrl);
                    res.text.should.containEql(album.name);
                    res.text.should.containEql(!!album.description ? album.description : '');

                    jsdom.env({html: res.text, src: [jquery], done: function (errors, window) {
                        var $ = window.$;
                        if (!!postData.city) $('a:contains("' + postData.city + '")').length.should.be.greaterThan(1);
                        if (!!postData.restaurant) $('a:contains("' + postData.restaurant + '")').length.should.be.greaterThan(1);
                        if (!!postData.category) $('a:contains("' + postData.category + '")').length.should.be.greaterThan(1);
                        $('a[href="'+album.editUrl+'"]').length.should.be.exactly(0);
                        $('a[href="'+album.deleteUrl+'"]').length.should.be.exactly(0);
                        $('[room="post-' + post._id + '"]').length.should.be.exactly(1);
                        $('[room="album-' + album._id + '"]').length.should.be.exactly(1);
                        done();
                    }});
                });
            });

            it('and album page should contain edit and delete links for owner', function(done) {
                socketer.authRequest(app, album.url, {email: user.email, password: user.profile.passwordString}, function(err, res) {
                    jsdom.env({html: res.body, src: [jquery], done: function (errors, window) {
                        var $ = window.$;
                        $('a[href="'+album.editUrl+'"]').length.should.be.exactly(1);
                        $('a[href="'+album.deleteUrl+'"]').length.should.be.exactly(1);
                        done(errors);
                    }});
                });
            });

            it('and user page should contain link to album and be subscribed to new albums', function(done) {
                request(app).get(user.url).end(function(err, res) {
                    jsdom.env({html: res.text, src: [jquery], done: function (errors, window) {
                        var $ = window.$;
                        $('a[href="' + album.url + '"]').length.should.be.exactly(1);
                        $('[room="albums-user-' + user._id + '"]').length.should.be.exactly(1);
                        done();
                    }});
                });
            });

            it('and can\'t be deleted on socket close or unchecking checkbox', function(done) {
                socket.emit('create-album', {
                    album: album._id,
                    create: false
                });
                socket.once('create-album', function(data) {
                    data.error.should.be.equal('Permission denied');
                    Album.findOne({_id: album._id}, function(err, albumDoc) {
                        albumDoc._id.should.be.eql(album._id);
                        done(err);
                    });
                });
            });

            after(function(done) {
                socket.disconnect(); // Free the socket
                album.remove();
                post.remove(done);
            });
        });
    });

    after(util.after);

});
