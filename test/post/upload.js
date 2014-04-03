'use strict';

process.env['MONGODB'] = 'mongodb://localhost:27017/mytestdb';
process.env.PORT = 4000;

var request = require('supertest'),
    superagent = require('superagent'),
    jsdom = require('jsdom'),
    should = require('should'),
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

    it('Upload page should redirect anonymous users', function(done) {
        request(app).get('/posts/new').expect(302).end(function(err, res) {
            res.headers.location.should.eql('/login');
            done();
        });
    });

    it('Logged in user should see upload page', function(done) {
        util.login(request, app, {email: userFixture.user.email, password: userFixture.user.password}, agent, '/posts/new', function(err, res){
            if (err) done(err);
            res.status.should.eql(200);
            res.text.should.containEql('Upload');
            done();
        });
    });

    after(util.after);

});
