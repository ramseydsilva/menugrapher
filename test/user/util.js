'use strict';

var util = require('../util'),
    User = require('../../models/User'),
    _ = require('underscore'),
    userFixture = require('../fixtures/db/user');

var loadUsers = function(next) {
    var users = [];
    _.each(userFixture.users, function(user) {
        // generate random email
        user.email = (Math.random() * 100000) + '@gmail.com';
        util.loadFixture(User, user, function(err, doc) {
            if (err) next(err);
            users.push(doc);
            if(users.length == userFixture.users.length)
                next(err, users);
        });
    });
};
module.exports.loadUsers = loadUsers;

