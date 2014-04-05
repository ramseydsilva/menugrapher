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
    request = require('supertest');

var album, album2, album3, album4, newRestaurant, newCategory, newCity, user;

describe('Album', function(done) {
    before(function(done) {
        util.loadDb(
            function(next) {
                albumUtil.loadAlbum(next);
            },
            function(err, results) {
                album = results[1].albums[0];
                album2 = results[1].albums[1];
                album3 = results[1].albums[2];
                album4 = results[1].albums[3];

                newRestaurant = results[1].restaurants[1];
                newCity = results[1].cities[1];
                newCategory = results[1].categories[1];

                user = results[1].users[0];
                var opts = {
                    _user: results[1].users[0]._id,
                    _city: results[1].cities[0]._id,
                    _restaurant: results[1].restaurants[0]._id,
                    _category: results[1].categories[0]._id
                };
                var post1 = Post({_user: user._id});
                var post2 = Post({_user: user._id});
                var post3 = Post({_user: user._id});
                async.parallel({
                    post1: function(next) {
                        post1.save(function(err, p1) {
                            next(err, p1);
                        });
                    },
                    post2: function(next) {
                        post2.save(function(err, p2) {
                            next(err, p2);
                        });
                    },
                    post3: function(next) {
                        post3.save(function(err, p3) {
                            next(err, p3);
                        });
                    },
                }, function(err, results) {
                    opts['$set'] = {'pics': [results.post1._id, results.post2._id]};
                    async.parallel({
                        album1: function(next) {
                            Album.findByIdAndUpdate(album._id, opts).populate('_restaurant').populate('_city').populate('_category').exec(function(err, doc) {
                                album = doc;
                                next(err);
                            });
                        },
                        album2: function(next) {
                            Album.findByIdAndUpdate(album2._id, opts).populate('_restaurant').populate('_city').populate('_category').exec(function(err, doc) {
                                album2 = doc;
                                next(err);
                            });
                        },
                        album3: function(next) {
                            Album.findByIdAndUpdate(album3._id, opts).populate('_restaurant').populate('_city').populate('_category').exec(function(err, doc) {
                                album3 = doc;
                                next(err);
                            });
                        },
                        album4: function(next) {
                            opts['$set'] = {'pics': [results.post3._id]};
                            Album.findByIdAndUpdate(album4._id, opts).populate('_restaurant').populate('_city').populate('_category').exec(function(err, doc) {
                                album4 = doc;
                                next(err);
                            });
                        }
                    }, function(err, results) {
                        done(err);
                    });
                });
            });
    });

    describe('can be edited by owner', function(done) {

        it('when trying to access add/edit/delete pages', function(done) {
            async.parallel([
                function(next) {
                    socketer.authRequest(app, album.editUrl, {email: user.email, password: user.profile.passwordString}, function(err, res) {
                        res.statusCode.should.be.exactly(200);
                        next(err);
                    });
                },
                function(next) {
                    socketer.authRequest(app, album.deleteUrl, {email: user.email, password: user.profile.passwordString}, function(err, res) {
                        res.statusCode.should.be.exactly(200);
                        next(err);
                    });
                },
                function(next) {
                    socketer.authRequest(app, album.addUrl, {email: user.email, password: user.profile.passwordString}, function(err, res) {
                        res.statusCode.should.be.exactly(200);
                        next(err);
                    });
                }
            ], function(err, results) {
                done(err);
            });
        });

        it('and edit page displays correct values', function(done) {
            socketer.authRequest(app, album.editUrl, {email: user.email, password: user.profile.passwordString}, function(err, res) {
                res.body.should.containEql(album._restaurant.name);
                res.body.should.containEql(album._city.name);
                res.body.should.containEql(album._category.name);
                res.body.should.containEql(album.description);
                done(err);
            });
        });

        it('by clicking save changes button on edit page which then redirects user to album page', function(done) {
            socketer.authSocket(app, {email: user.email, password: user.profile.passwordString}, function(authSocket) {
                var socket = authSocket;
                var description = 'new desc', name = 'My new title', city = 'Rio de Janeiro', restaurant = 'Copa cabanan', category = 'Mexican';
                socket.emit('album-update', {
                    id: album._id,
                    name: name,
                    city: city,
                    restaurant: restaurant,
                    category: category,
                    description: description
                });
                socket.once('album-update', function(data) {
                    socket.disconnect();
                    data[0].action.should.be.exactly('redirect');
                    data[0].url.should.be.exactly(album.url);
                    Album.findOne({_id: album._id}).populate('_city').populate('_restaurant').populate('_category').exec(function(err, doc) {
                        doc.name.should.be.exactly(name);
                        doc._city.name.should.be.exactly(city);
                        doc._restaurant.name.should.be.exactly(restaurant);
                        doc._category.name.should.be.exactly(category);
                        done(err);
                    });
                });
            });
        });

        it('and on editing city, category, restaurant, posts info gets updated if user selects apply to post', function(done) {
            Post.update({_id: album.pics[0]._id}, {$unset: {_restaurant: 1, _city: 1, _category: 1}}, function(err, doc) {
                socketer.authSocket(app, {email: user.email, password: user.profile.passwordString}, function(authSocket) {
                    var description = 'new desc', name = 'My new title', city = 'Rio de Janeiro', restaurant = 'Copa cabanan', category = 'Mexican';
                    authSocket.emit('album-update', {
                        id: album._id,
                        name: name,
                        city: city,
                        restaurant: restaurant,
                        category: category,
                        description: description,
                        applyToPost: 'true'
                    });
                    authSocket.once('album-update', function(data) {
                        authSocket.disconnect();
                        Post.findOne({_id: album.pics[0]}).populate('_city').populate('_restaurant').populate('_category').exec(function(err, doc) {
                            doc._city.name.should.be.exactly(city);
                            doc._restaurant.name.should.be.exactly(restaurant);
                            doc._category.name.should.be.exactly(category);
                            done(err);
                        });
                    });
                });
            });
        });;

        it('and on editing city, category, restaurant, posts info doesn\'t get updated if empty', function(done) {
            Post.collection.update({_id: album4.pics[0]._id}, {$unset: {_restaurant: 1, _city: 1, _category: 1}}, function(err, doc) {
                socketer.authSocket(app, {email: user.email, password: user.profile.passwordString}, function(authSocket) {
                    var description = 'new desc', name = 'My new title', city = 'Rio de Janeiro', restaurant = 'Copa cabanan', category = 'Mexican';
                    authSocket.emit('album-update', {
                        id: album._id,
                        name: name,
                        city: city,
                        restaurant: restaurant,
                        category: category,
                        description: description
                    });
                    authSocket.once('album-update', function(data) {
                        authSocket.disconnect();
                        Post.findOne({_id: album4.pics[0]}).populate('_city').populate('_restaurant').populate('_category').exec(function(err, doc) {
                            (!!doc._city).should.not.be.ok;
                            (!!doc._restaurant).should.not.be.ok;
                            (!!doc._category).should.not.be.ok;
                            done(err);
                        });
                    });
                });
            });
        });;

        it('and on editing city, category, restaurant, posts info doesn\'t get updated if not empty', function(done) {
            Post.update({_id: album.pics[0]}, {$set: {_restaurant: newRestaurant._id, _city: newCity._id, _category: newCategory._id}}, function(err, doc) {
                socketer.authSocket(app, {email: user.email, password: user.profile.passwordString}, function(authSocket) {
                    var description = 'new desc', name = 'My new title', city = 'Rio de Janeiro', restaurant = 'Copa cabanan', category = 'Mexican';
                    authSocket.emit('album-update', {
                        id: album._id,
                        name: name,
                        city: city,
                        restaurant: restaurant,
                        category: category,
                        description: description
                    });
                    authSocket.once('album-update', function(data) {
                        authSocket.disconnect();
                        Post.findOne({_id: album.pics[0]}).populate('_city').populate('_restaurant').populate('_category').exec(function(err, doc) {
                            doc._city.name.should.not.be.exactly(city);
                            doc._restaurant.name.should.not.be.exactly(restaurant);
                            doc._category.name.should.not.be.exactly(category);
                            done(err);
                        });
                    });
                });
            });
        });;

        it('and on editing city, category, restaurant, posts info doesn\'t get updated if user selects don\'t apply to post', function(done) {
            Post.update({_id: album.pics[0]}, {$set: {_restaurant: newRestaurant._id, _city: newCity._id, _category: newCategory._id}}, function(err, doc) {
                socketer.authSocket(app, {email: user.email, password: user.profile.passwordString}, function(authSocket) {
                    var description = 'new desc', name = 'My new title', city = 'Rio de Janeiro', restaurant = 'Copa cabanan', category = 'Mexican';
                    authSocket.emit('album-update', {
                        id: album._id,
                        name: name,
                        city: city,
                        restaurant: restaurant,
                        category: category,
                        description: description,

                    });
                    authSocket.once('album-update', function(data) {
                        authSocket.disconnect();
                        Post.findOne({_id: album.pics[0]}).populate('_city').populate('_restaurant').populate('_category').exec(function(err, doc) {
                            doc._city.name.should.not.be.exactly(city);
                            doc._restaurant.name.should.not.be.exactly(restaurant);
                            doc._category.name.should.not.be.exactly(category);
                            done(err);
                        });
                    });
                });
            });
        });;

    });

    describe('cannot be edited by anonymous user', function(done) {

        it('when trying to access add/edit/delete pages', function(done) {
            async.parallel([
                function(next) {
                    socketer.anonRequest(app, album.addUrl, function(err, res) {
                        res.statusCode.should.be.exactly(403);
                        next(err);
                    });
                },
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
                }
            ], function(err, results) {
                done(err);
            });
        });

        it('when trying to click on save changes button', function(done) {
            socketer.anonSocket(app, function(anonSocket) {
                var description = 'ddd', name = 'My alt title', city = 'Sydney', restaurant = 'Blablaresto', category = 'Australian';
                anonSocket.emit('album-update', {
                    id: album._id,
                    name: name,
                    city: city,
                    restaurant: restaurant,
                    category: category,
                    description: description
                });
                anonSocket.once('album-update', function(data) {
                    anonSocket.disconnect();
                    data.error.should.be.eql('Permission denied');
                    Album.findOne({_id: album._id}).populate('_city').populate('_restaurant').populate('_category').exec(function(err, doc) {
                        doc.name.should.not.be.eql(name);
                        doc._city.name.should.not.be.eql(city);
                        doc._restaurant.name.should.not.be.eql(restaurant);
                        doc._category.name.should.not.be.eql(category);
                        done(err);
                    });
                });
            });
        });

    });

    describe('can be deleted', function(done) {

        it('by owner but the pictures can remain and user should be redirected to profile page', function(done) {
            socketer.authSocket(app, {email: user.email, password: user.profile.passwordString}, function(authSocket) {
                authSocket.emit('album-delete', {
                    id: album._id,
                    deletePics: 'false'
                });
                authSocket.once('album-delete', function(data) {
                    authSocket.disconnect();
                    data[0].action.should.be.eql('redirect');
                    data[0].url.should.be.eql(user.url);
                    Album.findOne({_id: album._id}, function(err, doc) {
                        (!!doc).should.not.be.ok;
                        Post.findOne({_id: album.pics[0]}, function(err, post) {
                            (!!post).should.be.ok;
                            done(err);
                        });
                    });
                });
            });
        });

        it('by owner and all the pictures be deleted as well and user should be redirected to profile page', function(done) {
            socketer.authSocket(app, {email: user.email, password: user.profile.passwordString}, function(authSocket) {
                authSocket.emit('album-delete', {
                    id: album2._id,
                    deletePics: 'true'
                });
                authSocket.once('album-delete', function(data) {
                    authSocket.disconnect();
                    data[0].action.should.be.eql('redirect');
                    data[0].url.should.be.eql(user.url);
                    Album.findOne({_id: album2._id}, function(err, doc) {
                        (!!doc).should.not.be.ok;
                        Post.findOne({_id: album2.pics[0]}, function(err, post) {
                            (!!post).should.not.be.ok;
                            done(err);
                        });
                    });
                });
            });
        });
    });

    describe('cannot be deleted', function(done) {

        it('by anonymous user', function(done) {
            socketer.anonSocket(app, function(anonSocket) {
                anonSocket.emit('album-delete', {
                    id: album3._id,
                    deletePics: 'true'
                });
                anonSocket.once('album-delete', function(data) {
                    anonSocket.disconnect();
                    data.error.should.be.eql('Permission denied');
                    Album.findOne({_id: album3._id}, function(err, doc) {
                        (!!doc).should.be.ok;
                        done(err);
                    });
                });
            });
        });

    });

    after(util.after);

});
