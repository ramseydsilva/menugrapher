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

    it('Updating non existant post gives error but creates new city, restaurant, category, items and links them together', function(done) {
        var socket = util.getSocketClient(app.server);
        socket.on('connect', function() {
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
        socket.on('post', function(data) {
            data.error.should.be.eql('Post not found');

            async.waterfall({
                city: function(next) {
                    City.find({}, function(err, cities) {
                        cities.length.should.be.exactly(1);
                        cities[0].name.should.be.exactly('Toronto');
                        next(err, cities[0]);
                    });
                },
                restaurant: function(city, next) {
                    Restaurant.find({}, function(err, restaurants) {
                        restaurants.length.should.be.exactly(1);
                        restaurants[0].name.should.be.exactly('Big Slice');
                        restaurants[0]._city.should.be.exactly(city._id);
                        next(err, city, restaurants[0]);
                    });
                },
                category: function(city, restaurant, next) {
                    Category.find({}, function(err, categories) {
                        categories.length.should.be.exactly(1);
                        categories[0].name.should.be.exactly('Pizza');
                        next(err, city, restaurant, categories[0]);
                    });
                },
                item: function(city, restaurant, category, next) {
                    Item.find({}, function(err, items) {
                        items.length.should.be.exactly(1);
                        items[0].name.should.be.exactly('Pepperoni pizza');
                        items[0]._restaurant.shoud.be.exactly(restaurant._id);
                        next(err, city, restaurant, category, items[0]);
                    });
                }
            }, function(err, results) {
                done();
            });
        });

});

after(util.after);

});
