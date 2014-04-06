'use strict';

var util = require('../util'),
    Item = require('../../models/item'),
    _ = require('underscore'),
    itemFixture = require('../fixtures/db/item');

var loadItems = function(next) {
    var items = [];
    _.each(itemFixture.items, function(item) {
        util.loadFixture(Item, item, function(err, doc) {
            if (err) next(err);
            items.push(doc);
            if (items.length == itemFixture.items.length)
                next(err, items);
        });
    });
};
module.exports.loadItems = loadItems;
