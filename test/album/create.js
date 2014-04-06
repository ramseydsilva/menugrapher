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
        album: '',
        create: true
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
        album: '',
        create: true
    };

    var postImageOnlyData = postImageData;
    postImageOnlyData['city'] = '';
    postImageOnlyData['restaurant'] = '';
    postImageOnlyData['category'] = '';
    postImageOnlyData['item'] = '';

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

        it('Empty album should not be deleted on socket close', function(done) {
            socket.disconnect(); // Also frees up socket
            setTimeout(function() {
                Album.find({}, function(err, docs) {
                    docs.length.should.not.be.exactly(0);
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
                    uploadImage(socket, postData);
                    socket.once('post-update', function(data) {
                        async.parallel({
                            post: function(next) {
                                Post.findOne({}, next);
                            },
                            album: function(next) {
                                Album.findOne().sort('-_id').exec(next);
                            },
                        }, function(err, results) {
                            album = results.album;
                            post = results.post;
                            done(err);
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
                no edit/delete/add links for anon user', function(done) {
                socketer.anonRequest(app, album.url, function(err, res) {
                    res.body.should.containEql(post.pic.thumbUrl);
                    res.body.should.containEql(album.name);
                    res.body.should.containEql(!!album.description ? album.description : '');

                    res.body.should.not.containEql(album.addUrl);
                    res.body.should.not.containEql(album.editUrl);
                    res.body.should.not.containEql(album.deleteUrl);
                    res.body.should.containEql(post.url);
                    res.body.should.not.containEql(post.editUrl);
                    res.body.should.not.containEql(post.deleteUrl);

                    jsdom.env({html: res.body, src: [jquery], done: function (errors, window) {
                        var $ = window.$;
                        if (!!postData.city) $('a:contains("' + postData.city + '")').length.should.be.greaterThan(1);
                        if (!!postData.restaurant) $('a:contains("' + postData.restaurant + '")').length.should.be.greaterThan(1);
                        if (!!postData.category) $('a:contains("' + postData.category + '")').length.should.be.greaterThan(1);
                        $('[room="post-' + post._id + '"]').length.should.be.exactly(1);
                        $('[room="album-' + album._id + '"]').length.should.be.exactly(1);
                        done();
                    }});
                });
            });

            it('and album page should contain edit/delete/add links for owner and post edit/delete links', function(done) {
                socketer.authRequest(app, album.url, {email: user.email, password: user.profile.passwordString}, function(err, res) {
                    res.body.should.containEql(album.addUrl);
                    res.body.should.containEql(album.editUrl);
                    res.body.should.containEql(album.deleteUrl);
                    res.body.should.containEql(post.url);
                    res.body.should.containEql(post.editUrl);
                    res.body.should.containEql(post.deleteUrl);
                    done();
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

            it('and can be deleted on unchecking checkbox and album header elements should be removed from page', function(done) {
                socket.emit('create-album', {
                    album: album._id,
                    delete: true
                });
                socket.once('create-album', function(data) {
                    (!!data.error).should.not.be.ok;
                    var toRemoveHeader = _.find(data, function(item) { return ['remove'].indexOf(item.action) != -1 });
                    toRemoveHeader.should.be.ok;
                    Album.findOne({_id: album._id}, function(err, albumDoc) {
                        (!!albumDoc).should.not.be.ok;
                        done(err);
                    });
                });
            });

            it('puts album header onto upload image page and links all the current posts to the album', function(done) {
                socket.emit('create-album', {
                    album: '',
                    create: true
                });

                socket.once('create-album', function(data) {
                    console.log(data);
                    var html = _.find(data, function(item) { return ['html', 'append', 'prepend', 'before', 'after'].indexOf(item.action) != -1 });
                    html.should.be.ok;
                    var albumId = _.find(data, function(item) { return item.action == 'val' }).elements['#album'];
                    Album.findOne({_id: albumId}, function(err, doc) {
                        album = doc;
                        (!!doc).should.be.ok;
                    });
                    done();
                });
            });

            it('has a generic name of Album 1, Album 2, Album 3 etc. not My new album 1 etc');

            after(function(done) {
                socket.disconnect(); // Free the socket
                album.remove();
                post.remove(done);
            });
        });
    });

    after(util.after);

});
