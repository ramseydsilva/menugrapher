'use strict';

process.env['MONGODB'] = 'mongodb://localhost:27017/mytestdb';

var request = require('supertest'),
    superagent = require('superagent'),
    jsdom = require('jsdom'),
    jquery = require('jquery'),
    async = require('async'),
    should = require('should'),
    app = require('../../app.js'),
    User = require('../../models/User'),
    userFixture = require('../fixtures/user.js'),
    fs = require("fs"),
    mongoose = require('mongoose'),
    jquery = fs.readFileSync("node_modules/jquery/dist/jquery.min.js", "utf-8"),
    user;

var agent = superagent.agent();

describe('GET /users', function() {
    before(function(done) {

        function clearDB(next) {
            for (var i in mongoose.connection.collections) {
                mongoose.connection.collections[i].remove(function() {});
            }
            return next(null);
        }

        async.series([
            function(next) {
                if (mongoose.connection.readyState === 0) {
                    mongoose.connect(process.env.MONGODB, function (err) {
                        if (err) {
                            throw err;
                        }
                        return clearDB(next);
                    });
                } else {
                    return clearDB(next);
                }
            },
            function(next) {
                user = User(userFixture.user);
                user.save(function(err, data) {
                    next(err, data);
                });
            }
        ], function(err, results) {
            if (err) {
                console.log("Error instantiating fixtures: " + err);
            }
            done(err);
        });
    });

    it('should return 200 OK', function(done) {
        request(app).get('/users').expect(200, done);
    });

    it('Users page should contain link to user page', function(done) {
        request(app).get('/users').end(function(err, res) {
            res.text.should.containEql(user.profile.name);
            jsdom.env({html: res.text, src: [jquery], done: function (errors, window) {
                var $ = window.$;
                $('a[href="' + user.url + '"]').length.should.be.exactly(1);
                done();
            }});

        });
    });

    it('Profile page should redirect to login if not signed in', function(done) {
        request(app).get('/profile').end(function(err, res) {
            res.headers.location.should.be.exactly('/login');
            done();
        });
    });

    it('Profile page should redirect to user page if signed in', function(done) {
        request(app).post('/login').send({email: userFixture.user.email, password: userFixture.user.password}).expect(302).end(function(err, res) {
            if (!err) {
                agent.saveCookies(res);
                var req = request(app).get('/profile');
                agent.attachCookies(req);
                req.end(function(err, res2) {
                    res2.headers.location.should.be.exactly(user.url);
                    done(err);
                });
            } else {
                done(err);
            }
        });
    });

    it('User link should work', function(done) {
        var req = request(app).get(user.url);
        agent.attachCookies(req);
        req.expect(200, done);
    });

    it('Home page should show the following links', function(done) {
        var req = request(app).get('/');
        agent.attachCookies(req);
        req.end(function(err, res) {
            res.text.should.containEql('Cities').and.containEql('Categories').and.containEql('My uploads').and.containEql('Recent uploads')
                .and.containEql('Home').and.containEql('Profile').and.containEql('Upload Picture');
            done(err);
        });
    });

    after(function (done) {
        mongoose.disconnect();
        return done();
    });

});
