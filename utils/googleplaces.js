'use strict';

var request = require('request'),
    xtend = require('xtend');

/**
 * Provides access to Google Places API
 * @namespace
 * @property {String} key Google API key
 * @property {String} searchUrl Url to search query
 * @property {String} detailsUrl Url to detail query
 * @property {String} textUrl Url to textual query
 */
var defaults = {
    key: key,
    sensor: false,
    query: '',
    name: '',
    reference: '',
    radius: 5000,
    types: 'food',
    location: ('43.653226, -79.3831843'),
    searchUrl: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
    detailsUrl: 'https://maps.googleapis.com/maps/api/place/details/json',
    textUrl: 'https://maps.googleapis.com/maps/api/place/textsearch/json',
};

/**
 * Performs google places text search
 * @method text
 * @param {String} query Search query
 * @param {GooglePlaces~requestCallback} callback
 */
GooglePlaces.prototype.text = function(query, callback) {
    var qs = {
        query: this.query,
        sensor: this.sensor,
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
},

/**
 * Performs google places basic search
 * @method search
 * @param {String} query Search query
 * @param {GooglePlaces~requestCallback} callback
 */
GooglePlaces.prototype.search = function(query, callback) {
    var qs = {
        location: this.location,
        radius: this.radius,
        types: this.types,
        name: this.name || this.query,
        sensor: this.sensor,
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
},

/**
 * Performs google places detail search
 * @method search
 * @param {String} query Search query
 * @param {GooglePlaces~requestCallback} callback
 */
GooglePlaces.prototype.details = function(callback) {
    var qs = {
        reference: this.reference,
        sensor: this.sensor,
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

module.exports = GooglePlaces
