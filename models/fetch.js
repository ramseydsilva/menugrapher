'use strict';

var mongoose = require('mongoose'),
    _ = require('underscore'),
    item = require('./item'),
    user = require('./User'),
    city = require('./city');

var schemaOptions = {
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    autoIndex: true
};

var fetchSchema = new mongoose.Schema({
    name: String,
    query: String,
    err: String,
    data: {},
    live: Boolean
}, schemaOptions);

var fetchModel = mongoose.model("fetch", fetchSchema);
module.exports = fetchModel;
