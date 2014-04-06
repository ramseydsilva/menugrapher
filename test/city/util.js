'use strict';

var util = require('../util'),
    City = require('../../models/city'),
    _ = require('underscore'),
    cityFixture = require('../fixtures/db/city');

var loadCities = function(next) {
    var cities = [];
    _.each(cityFixture.cities, function(city) {
        util.loadFixture(City, city, function(err, doc) {
            if(err) next(err);
            cities.push(doc);
            if (cities.length == cityFixture.cities.length)
                next(err, cities);
        });
    });
};
module.exports.loadCities = loadCities;
