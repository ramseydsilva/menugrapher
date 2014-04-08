'use strict';

var request = require('request');

var searchUrl = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
var detailsUrl = 'https://maps.googleapis.com/maps/api/place/details/json';
var textUrl = 'https://maps.googleapis.com/maps/api/place/textsearch/json';

var GooglePlaces = function(key) {
    this.key = key;

    this.text = function(query, callback) {
        var qs = {
            query: query.query,
            sensor: false,
            key: this.key
        }
        request.get(textUrl, {
            qs: qs,
            json: true
        }, function(err, res, json) {
            if (!err && json.status == "OK") {
                if (typeof json == "object" && json.results.length > 0) {
                    callback(null, json.results);
                } else {
                    callback(new Error("No results returned"), null);
                }
            } else {
                callback(new Error("Non ok status returned"), null);
            }
        });
    }

    this.search = function(query, callback) {
        var qs = {
            location: query.location || '43.653226, -79.3831843',
            radius: query.radius || 1000,
            types: query.types || 'food',
            name: query.name,
            sensor: false,
            key: this.key
        }
        request.get(searchUrl, {
            qs: qs,
            json: true
        }, function(err, res, json) {
            if (!err && json.status == "OK") {
                if (typeof json == "object" && json.results.length > 0) {
                    callback(null, json.results);
                } else {
                    callback(new Error("No results returned"), null);
                }
            } else {
                callback(new Error("Non ok status returned"), null);
            }
        });
    }

    this.details = function(query, callback) {
        var qs = {
            reference: query.reference || '',
            sensor: false,
            key: this.key
        }
        request.get(detailsUrl, {
            qs: qs,
            json: true
        }, function(err, res, json) {
            if (!err && json.status == "OK") {
                if (typeof json == "object" && !!json.result) {
                    callback(null, json.result);
                } else {
                    callback(new Error("No results returned"), null);
                }
            } else {
                callback(new Error("Non ok status returned"), null);
            }
        });
    }
}
module.exports = GooglePlaces
