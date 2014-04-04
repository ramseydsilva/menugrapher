'use strict';

var util = require('../util'),
    User = require('../../models/User'),
    _ = require('underscore'),
    userFixture = require('../fixtures/db/user');

var users = [];
var loadUsers = function(next) {
    _.each(userFixture.users, function(user) {
        util.loadFixture(User, user, function(err, doc) {
            if (err) next(err);
            users.push(doc);
            if(users.length == userFixture.users.length)
                next(err, users);
        });
    });
};
module.exports.loadUsers = loadUsers;

