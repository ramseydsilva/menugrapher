'use strict';

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
    postUtil = require('./util'),
    socketer = require('socketer'),
    jquery = require('fs').readFileSync("node_modules/jquery/dist/jquery.min.js", "utf-8"),
    user;

var agent = superagent.agent();

describe('GET /users', function() {
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

    it('Updating non existant post gives error but creates new city, restaurant, category, items and links them together', function(done) {
        socketer.anonSocket(app, function(socket) {
            socket.once('connect', function() {
                socket.emit('post-update', {
                    id: 'Mypostid',
                    title: 'Post title',
                    description: 'Post description',
                    city: 'Toronto',
                    restaurant: 'Big Slice',
                    category: 'Pizza',
                    item: 'Pepperoni pizza'
                });
            });
            socket.once('post', function(data) {
                data.error.should.be.eql('Post not found');
                postUtil.ensureCityRestaurantCategoryItemLinkage('Toronto', 'Big Slice', 'Pizza', 'Pepperoni pizza', function(err, results) {
                    socket.disconnect();
                    done(err);
                });
            });
        });
    });

    after(util.after);

});
