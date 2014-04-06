'use strict';

var util = require('../util'),
    Category = require('../../models/category'),
    _ = require('underscore'),
    categoryFixture = require('../fixtures/db/category');

var loadCategories = function(next) {
    var categories = [];
    _.each(categoryFixture.categories, function(category) {
        util.loadFixture(Category, category, function(err, doc) {
            if (err) next(err);
            categories.push(doc);
            if (categories.length == categoryFixture.categories.length)
                next(err, categories);
        });
    });
};
module.exports.loadCategories = loadCategories;
